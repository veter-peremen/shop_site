import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { CART_SESSION_COOKIE } from "@/lib/cart-constants";
import { query, queryOne, withTransaction } from "@/lib/db";

export type CartLineInput = {
  productId: string;
  quantity: number;
};

export type ValidatedCartLine = {
  productId: string;
  slug: string;
  nameRu: string;
  nameEn: string;
  requestedQuantity: number;
  quantity: number;
  price: number;
  bonusPoints: number;
  stock: number;
  available: boolean;
  adjusted: boolean;
};

type ProductStockRow = {
  id: string;
  slug: string;
  name_ru: string;
  name_en: string;
  price: number;
  bonus_points: number;
  stock: number;
  is_active: boolean;
};

export async function validateCartLines(lines: CartLineInput[]): Promise<{
  lines: ValidatedCartLine[];
  subtotal: number;
  hasChanges: boolean;
}> {
  if (lines.length === 0) {
    return { lines: [], subtotal: 0, hasChanges: false };
  }

  const ids = lines.map((line) => line.productId);
  const rows = await query<ProductStockRow>(
    `select id, slug, name_ru, name_en, price, bonus_points, stock, is_active
     from products
     where id = any($1::text[])`,
    [ids],
  );

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  let hasChanges = false;

  const validated: ValidatedCartLine[] = lines.map((line) => {
    const row = rowsById.get(line.productId);

    if (!row || !row.is_active) {
      hasChanges = true;
      return {
        productId: line.productId,
        slug: row?.slug ?? "",
        nameRu: row?.name_ru ?? "",
        nameEn: row?.name_en ?? "",
        requestedQuantity: line.quantity,
        quantity: 0,
        price: row?.price ?? 0,
        bonusPoints: row?.bonus_points ?? 0,
        stock: row?.stock ?? 0,
        available: false,
        adjusted: true,
      };
    }

    const quantity = Math.max(0, Math.min(line.quantity, row.stock));
    if (quantity !== line.quantity) hasChanges = true;

    return {
      productId: row.id,
      slug: row.slug,
      nameRu: row.name_ru,
      nameEn: row.name_en,
      requestedQuantity: line.quantity,
      quantity,
      price: row.price,
      bonusPoints: row.bonus_points,
      stock: row.stock,
      available: quantity > 0,
      adjusted: quantity !== line.quantity,
    };
  });

  const subtotal = validated.reduce((sum, line) => sum + line.price * line.quantity, 0);

  return { lines: validated, subtotal, hasChanges };
}

export type CartIdentity = { userId: string | null; sessionId: string | null };

export async function resolveCartIdentity(userId: string | null): Promise<CartIdentity> {
  if (userId) return { userId, sessionId: null };

  const cookieStore = await cookies();
  let sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;

  if (!sessionId) {
    sessionId = randomBytes(32).toString("hex");
    try {
      cookieStore.set(CART_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    } catch {
      // cookies() is read-only outside a Server Action / Route Handler; middleware sets it on the next navigation.
    }
  }

  return { userId: null, sessionId };
}

async function findCartId(identity: CartIdentity): Promise<string | null> {
  if (identity.userId) {
    const row = await queryOne<{ id: string }>(`select id from carts where user_id = $1`, [identity.userId]);
    return row?.id ?? null;
  }
  if (identity.sessionId) {
    const row = await queryOne<{ id: string }>(`select id from carts where session_id = $1`, [identity.sessionId]);
    return row?.id ?? null;
  }
  return null;
}

async function findOrCreateCartId(identity: CartIdentity): Promise<string> {
  if (identity.userId) {
    const row = await queryOne<{ id: string }>(
      `insert into carts (user_id) values ($1)
       on conflict (user_id) where user_id is not null
       do update set updated_at = now()
       returning id`,
      [identity.userId],
    );
    return row!.id;
  }

  if (identity.sessionId) {
    const row = await queryOne<{ id: string }>(
      `insert into carts (session_id) values ($1)
       on conflict (session_id) where session_id is not null
       do update set updated_at = now()
       returning id`,
      [identity.sessionId],
    );
    return row!.id;
  }

  throw new Error("cart identity requires a userId or sessionId");
}

async function getRawCartLines(cartId: string): Promise<CartLineInput[]> {
  const rows = await query<{ product_id: string; quantity: number }>(
    `select product_id, quantity from cart_items where cart_id = $1`,
    [cartId],
  );
  return rows.map((row) => ({ productId: row.product_id, quantity: row.quantity }));
}

export async function getCart(identity: CartIdentity): Promise<{ lines: ValidatedCartLine[]; subtotal: number }> {
  const cartId = await findCartId(identity);
  if (!cartId) return { lines: [], subtotal: 0 };

  const rawLines = await getRawCartLines(cartId);
  const { lines, subtotal } = await validateCartLines(rawLines);
  return { lines, subtotal };
}

export async function addCartItem(
  identity: CartIdentity,
  productId: string,
  quantity: number,
): Promise<{ lines: ValidatedCartLine[]; subtotal: number }> {
  const product = await queryOne<{ stock: number }>(
    `select stock from products where id = $1 and is_active = true`,
    [productId],
  );
  if (!product) return getCart(identity);

  const cartId = await findOrCreateCartId(identity);
  const addQty = Math.max(1, Math.floor(quantity));
  const cap = Math.min(product.stock, 99);

  if (cap > 0) {
    await query(
      `insert into cart_items (cart_id, product_id, quantity)
       values ($1, $2, least($3::integer, $4::integer))
       on conflict (cart_id, product_id)
       do update set quantity = least(cart_items.quantity + $3::integer, $4::integer)`,
      [cartId, productId, addQty, cap],
    );
  }

  return getCart(identity);
}

export async function setCartItemQuantity(
  identity: CartIdentity,
  productId: string,
  quantity: number,
): Promise<{ lines: ValidatedCartLine[]; subtotal: number }> {
  if (quantity <= 0) {
    return removeCartItem(identity, productId);
  }

  const product = await queryOne<{ stock: number }>(
    `select stock from products where id = $1 and is_active = true`,
    [productId],
  );
  if (!product) return getCart(identity);

  const cartId = await findOrCreateCartId(identity);
  const clamped = Math.max(1, Math.min(Math.floor(quantity), product.stock, 99));

  await query(
    `insert into cart_items (cart_id, product_id, quantity)
     values ($1, $2, $3)
     on conflict (cart_id, product_id) do update set quantity = $3`,
    [cartId, productId, clamped],
  );

  return getCart(identity);
}

export async function removeCartItem(
  identity: CartIdentity,
  productId: string,
): Promise<{ lines: ValidatedCartLine[]; subtotal: number }> {
  const cartId = await findCartId(identity);
  if (cartId) {
    await query(`delete from cart_items where cart_id = $1 and product_id = $2`, [cartId, productId]);
  }
  return getCart(identity);
}

export async function clearCartItems(identity: CartIdentity): Promise<void> {
  const cartId = await findCartId(identity);
  if (cartId) {
    await query(`delete from cart_items where cart_id = $1`, [cartId]);
  }
}

export async function mergeGuestCartIntoUser(userId: string, sessionId: string | null): Promise<void> {
  if (!sessionId) return;

  await withTransaction(async (client) => {
    const guestCart = await client.query<{ id: string }>(`select id from carts where session_id = $1`, [
      sessionId,
    ]);
    if (guestCart.rowCount === 0) return;
    const guestCartId = guestCart.rows[0].id;

    const guestItems = await client.query<{ product_id: string; quantity: number }>(
      `select product_id, quantity from cart_items where cart_id = $1`,
      [guestCartId],
    );

    if (guestItems.rowCount! > 0) {
      const userCart = await client.query<{ id: string }>(
        `insert into carts (user_id) values ($1)
         on conflict (user_id) where user_id is not null
         do update set updated_at = now()
         returning id`,
        [userId],
      );
      const userCartId = userCart.rows[0].id;

      for (const item of guestItems.rows) {
        const product = await client.query<{ stock: number }>(
          `select stock from products where id = $1 and is_active = true`,
          [item.product_id],
        );
        if (product.rowCount === 0) continue;
        const cap = Math.min(product.rows[0].stock, 99);
        if (cap <= 0) continue;

        await client.query(
          `insert into cart_items (cart_id, product_id, quantity)
           values ($1, $2, least($3::integer, $4::integer))
           on conflict (cart_id, product_id)
           do update set quantity = least(cart_items.quantity + $3::integer, $4::integer)`,
          [userCartId, item.product_id, item.quantity, cap],
        );
      }
    }

    await client.query(`delete from carts where id = $1`, [guestCartId]);
  });
}

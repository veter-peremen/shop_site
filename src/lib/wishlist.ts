import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { CART_SESSION_COOKIE } from "@/lib/cart-constants";
import { query, withTransaction } from "@/lib/db";

export type WishlistIdentity = { userId: string | null; sessionId: string | null };

export async function resolveWishlistIdentity(userId: string | null): Promise<WishlistIdentity> {
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

export async function getWishlist(identity: WishlistIdentity): Promise<string[]> {
  if (identity.userId) {
    const rows = await query<{ product_id: string }>(
      `select product_id from wishlist_items where user_id = $1`,
      [identity.userId],
    );
    return rows.map((row) => row.product_id);
  }
  if (identity.sessionId) {
    const rows = await query<{ product_id: string }>(
      `select product_id from wishlist_items where session_id = $1`,
      [identity.sessionId],
    );
    return rows.map((row) => row.product_id);
  }
  return [];
}

export async function addWishlistItem(identity: WishlistIdentity, productId: string): Promise<string[]> {
  if (identity.userId) {
    await query(
      `insert into wishlist_items (user_id, product_id) values ($1, $2)
       on conflict (user_id, product_id) where user_id is not null do nothing`,
      [identity.userId, productId],
    );
  } else if (identity.sessionId) {
    await query(
      `insert into wishlist_items (session_id, product_id) values ($1, $2)
       on conflict (session_id, product_id) where session_id is not null do nothing`,
      [identity.sessionId, productId],
    );
  }
  return getWishlist(identity);
}

export async function removeWishlistItem(identity: WishlistIdentity, productId: string): Promise<string[]> {
  if (identity.userId) {
    await query(`delete from wishlist_items where user_id = $1 and product_id = $2`, [
      identity.userId,
      productId,
    ]);
  } else if (identity.sessionId) {
    await query(`delete from wishlist_items where session_id = $1 and product_id = $2`, [
      identity.sessionId,
      productId,
    ]);
  }
  return getWishlist(identity);
}

export async function mergeGuestWishlistIntoUser(userId: string, sessionId: string | null): Promise<void> {
  if (!sessionId) return;

  await withTransaction(async (client) => {
    const guestItems = await client.query<{ product_id: string }>(
      `select product_id from wishlist_items where session_id = $1`,
      [sessionId],
    );

    for (const item of guestItems.rows) {
      await client.query(
        `insert into wishlist_items (user_id, product_id) values ($1, $2)
         on conflict (user_id, product_id) where user_id is not null do nothing`,
        [userId, item.product_id],
      );
    }

    await client.query(`delete from wishlist_items where session_id = $1`, [sessionId]);
  });
}

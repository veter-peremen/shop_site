import type { PoolClient } from "pg";

import { query, queryOne, withTransaction } from "@/lib/db";
import { validateCartLines, type CartLineInput } from "@/lib/cart";
import { validatePromo } from "@/lib/promos";
import { getSettings, type StoreSettings } from "@/lib/settings";
import { recalculateLoyaltyLevel } from "@/lib/users";

class StockConflictError extends Error {
  constructor(public productId: string) {
    super(`insufficient stock for product ${productId}`);
  }
}

export type CreateOrderInput = {
  userId?: string | null;
  items: CartLineInput[];
  customer: {
    name: string;
    phone: string;
    email: string;
    comment?: string;
  };
  delivery?: {
    city?: string;
    method?: string;
    address?: string;
    pickupPoint?: string;
    price?: number;
  };
  promoCode?: string;
  bonusSpent?: number;
};

export type CreateOrderResult =
  | { ok: true; order: { id: string; number: string; total: number } }
  | { ok: false; error: "empty-cart" | "unavailable-items"; lines?: unknown };

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { lines, subtotal, hasChanges } = await validateCartLines(input.items);
  const availableLines = lines.filter((line) => line.available);

  if (availableLines.length === 0) {
    return { ok: false, error: "empty-cart" };
  }

  if (hasChanges) {
    return { ok: false, error: "unavailable-items", lines };
  }

  let discount = 0;
  let appliedPromoCode: string | null = null;
  let bonusSpendAllowed = true;

  if (input.promoCode) {
    const result = await validatePromo(
      input.promoCode,
      subtotal,
      input.userId ?? null,
      availableLines.map((line) => line.productId),
    );
    if (result.valid) {
      discount = result.discount;
      appliedPromoCode = result.promo!.code;
      bonusSpendAllowed = result.promo!.combinableWithBonuses;
    }
  }

  const settings = await getSettings();
  const afterDiscount = Math.max(0, subtotal - discount);
  const bonusSpentRequested = bonusSpendAllowed ? Math.max(0, Math.floor(input.bonusSpent ?? 0)) : 0;
  const bonusCap = Math.floor(afterDiscount * settings.bonusMaxSpendShare);
  const deliveryPrice = Math.max(0, Math.floor(input.delivery?.price ?? 0));

  try {
    return await withTransaction(async (client) => {
      let bonusSpent = 0;
      let loyaltyLevel: keyof StoreSettings["bonusLoyaltyRates"] = "silk";

      if (input.userId) {
        const account = await client.query<{ balance_active: number; loyalty_level: string }>(
          `select balance_active, loyalty_level from bonus_accounts where user_id = $1 for update`,
          [input.userId],
        );
        const balanceActive = account.rows[0]?.balance_active ?? 0;
        loyaltyLevel = (account.rows[0]?.loyalty_level ?? "silk") as typeof loyaltyLevel;

        if (bonusSpentRequested > 0) {
          bonusSpent = Math.min(bonusSpentRequested, bonusCap, balanceActive);
        }
      }

      const accrualRate = settings.bonusLoyaltyRates[loyaltyLevel];
      const bonusEarned = availableLines.reduce((sum, line) => {
        const points =
          line.bonusPoints > 0 ? line.bonusPoints : Math.round((line.price * accrualRate) / 100);
        return sum + points * line.quantity;
      }, 0);

      const total = Math.max(0, afterDiscount - bonusSpent) + deliveryPrice;

      const numberRow = await client.query<{ number: string }>(
        `select 'SK-' || nextval('order_number_seq') as number`,
      );
      const orderNumber = numberRow.rows[0].number;

      const orderRow = await client.query<{ id: string }>(
        `insert into orders (
          number, user_id, status, customer_name, customer_phone, customer_email, comment,
          city, delivery_method, delivery_address, delivery_pickup_point, delivery_price,
          subtotal, discount, bonus_spent, bonus_earned, total, promo_code, payment_status
        ) values (
          $1, $2, 'pending_payment', $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, 'unpaid'
        ) returning id`,
        [
          orderNumber,
          input.userId ?? null,
          input.customer.name,
          input.customer.phone,
          input.customer.email,
          input.customer.comment ?? null,
          input.delivery?.city ?? null,
          input.delivery?.method ?? null,
          input.delivery?.address ?? null,
          input.delivery?.pickupPoint ?? null,
          deliveryPrice,
          subtotal,
          discount,
          bonusSpent,
          bonusEarned,
          total,
          appliedPromoCode,
        ],
      );

      const orderId = orderRow.rows[0].id;

      for (const line of availableLines) {
        await client.query(
          `insert into order_items (order_id, product_id, name_ru, name_en, price, quantity, bonus_points)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [orderId, line.productId, line.nameRu, line.nameEn, line.price, line.quantity, line.bonusPoints],
        );

        const decremented = await client.query(
          `update products set stock = stock - $1, updated_at = now() where id = $2 and stock >= $1`,
          [line.quantity, line.productId],
        );

        if (decremented.rowCount === 0) {
          throw new StockConflictError(line.productId);
        }

        await client.query(
          `insert into inventory_movements (product_id, order_id, delta, reason, comment)
           values ($1, $2, $3, 'order_reserved', $4)`,
          [line.productId, orderId, -line.quantity, `Резерв под заказ ${orderNumber}`],
        );
      }

      if (appliedPromoCode) {
        await client.query(
          `insert into promo_code_usages (promo_code_id, order_id)
           select id, $2 from promo_codes where code = $1`,
          [appliedPromoCode, orderId],
        );
      }

      if (input.userId) {
        if (bonusSpent > 0) {
          await client.query(
            `update bonus_accounts set balance_active = balance_active - $1, updated_at = now()
             where user_id = $2`,
            [bonusSpent, input.userId],
          );
          await client.query(
            `insert into bonus_transactions (user_id, order_id, type, amount, status)
             values ($1, $2, 'spend', $3, 'spent')`,
            [input.userId, orderId, bonusSpent],
          );
        }

        if (bonusEarned > 0) {
          await client.query(
            `update bonus_accounts set balance_pending = balance_pending + $1, updated_at = now()
             where user_id = $2`,
            [bonusEarned, input.userId],
          );
          await client.query(
            `insert into bonus_transactions (user_id, order_id, type, amount, status)
             values ($1, $2, 'accrual', $3, 'pending')`,
            [input.userId, orderId, bonusEarned],
          );
        }
      }

      return { ok: true, order: { id: orderId, number: orderNumber, total } };
    });
  } catch (error) {
    if (error instanceof StockConflictError) {
      return { ok: false, error: "unavailable-items" };
    }
    throw error;
  }
}

export type OrderItemDetail = {
  id: string;
  productId: string | null;
  sku: string | null;
  nameRu: string;
  nameEn: string | null;
  price: number;
  quantity: number;
  bonusPoints: number;
};

export type OrderDetail = OrderSummary & {
  userId: string | null;
  customerPhone: string | null;
  comment: string | null;
  city: string | null;
  deliveryMethod: string | null;
  deliveryAddress: string | null;
  deliveryPickupPoint: string | null;
  deliveryPrice: number;
  items: OrderItemDetail[];
};

type OrderDetailRow = OrderRow & {
  user_id: string | null;
  customer_phone: string | null;
  comment: string | null;
  city: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  delivery_pickup_point: string | null;
  delivery_price: number;
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  sku: string | null;
  name_ru: string;
  name_en: string | null;
  price: number;
  quantity: number;
  bonus_points: number;
};

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const row = await queryOne<OrderDetailRow>(
    `select id, number, status, user_id, customer_name, customer_phone, customer_email, comment,
            city, delivery_method, delivery_address, delivery_pickup_point, delivery_price,
            subtotal, discount, bonus_spent, bonus_earned, total, promo_code,
            payment_status, delivery_status, tracking_number, created_at
     from orders
     where id = $1`,
    [id],
  );

  if (!row) return null;

  const itemRows = await query<OrderItemRow>(
    `select id, product_id, sku, name_ru, name_en, price, quantity, bonus_points
     from order_items
     where order_id = $1
     order by created_at asc`,
    [id],
  );

  return {
    ...mapOrderRow(row),
    userId: row.user_id,
    customerPhone: row.customer_phone,
    comment: row.comment,
    city: row.city,
    deliveryMethod: row.delivery_method,
    deliveryAddress: row.delivery_address,
    deliveryPickupPoint: row.delivery_pickup_point,
    deliveryPrice: row.delivery_price,
    items: itemRows.map((item) => ({
      id: item.id,
      productId: item.product_id,
      sku: item.sku,
      nameRu: item.name_ru,
      nameEn: item.name_en,
      price: item.price,
      quantity: item.quantity,
      bonusPoints: item.bonus_points,
    })),
  };
}

export type OrderSummary = {
  id: string;
  number: string;
  status: string;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  discount: number;
  bonusSpent: number;
  bonusEarned: number;
  total: number;
  promoCode: string | null;
  paymentStatus: string;
  deliveryStatus: string | null;
  trackingNumber: string | null;
  createdAt: string;
};

type OrderRow = {
  id: string;
  number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  discount: number;
  bonus_spent: number;
  bonus_earned: number;
  total: number;
  promo_code: string | null;
  payment_status: string;
  delivery_status: string | null;
  tracking_number: string | null;
  created_at: string;
};

function mapOrderRow(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    subtotal: row.subtotal,
    discount: row.discount,
    bonusSpent: row.bonus_spent,
    bonusEarned: row.bonus_earned,
    total: row.total,
    promoCode: row.promo_code,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    trackingNumber: row.tracking_number,
    createdAt: row.created_at,
  };
}

export async function getOrdersByUser(userId: string, limit = 50): Promise<OrderSummary[]> {
  const rows = await query<OrderRow>(
    `select id, number, status, customer_name, customer_email, subtotal, discount,
            bonus_spent, bonus_earned, total, promo_code, payment_status, delivery_status,
            tracking_number, created_at
     from orders
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, limit],
  );
  return rows.map(mapOrderRow);
}

const ORDER_STATUSES = new Set([
  "draft",
  "pending_payment",
  "paid",
  "payment_failed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "partially_refunded",
]);

const STOCK_RELEASE_STATUSES = new Set(["cancelled", "payment_failed", "refunded", "partially_refunded"]);

function derivePaymentStatus(status: string): string {
  if (["paid", "processing", "packed", "shipped", "delivered"].includes(status)) return "paid";
  if (status === "refunded" || status === "partially_refunded") return "refunded";
  return "unpaid";
}

function deriveDeliveryStatus(status: string): string | null {
  if (status === "shipped") return "shipped";
  if (status === "delivered") return "delivered";
  if (STOCK_RELEASE_STATUSES.has(status) && status !== "payment_failed") return "cancelled";
  return null;
}

async function activateOrderBonuses(client: PoolClient, orderId: string, userId: string | null) {
  if (!userId) return;

  const settings = await getSettings();
  const pending = await client.query<{ id: string; amount: number }>(
    `select id, amount from bonus_transactions
     where order_id = $1 and type = 'accrual' and status = 'pending'`,
    [orderId],
  );

  for (const row of pending.rows) {
    await client.query(
      `update bonus_transactions set status = 'active', activated_at = now(),
       expires_at = now() + ($1 * interval '1 day') where id = $2`,
      [Math.trunc(settings.bonusExpiryDays), row.id],
    );
    await client.query(
      `update bonus_accounts set balance_pending = greatest(balance_pending - $1, 0),
       balance_active = balance_active + $1, updated_at = now()
       where user_id = $2`,
      [row.amount, userId],
    );
  }
}

async function reverseOrderBonuses(client: PoolClient, orderId: string, userId: string | null) {
  if (!userId) return;

  const accruals = await client.query<{ id: string; amount: number; status: string }>(
    `select id, amount, status from bonus_transactions
     where order_id = $1 and type = 'accrual' and status in ('pending', 'active')`,
    [orderId],
  );

  for (const row of accruals.rows) {
    await client.query(`update bonus_transactions set status = 'cancelled' where id = $1`, [row.id]);

    if (row.status === "pending") {
      await client.query(
        `update bonus_accounts set balance_pending = greatest(balance_pending - $1, 0), updated_at = now()
         where user_id = $2`,
        [row.amount, userId],
      );
    } else {
      await client.query(
        `update bonus_accounts set balance_active = greatest(balance_active - $1, 0), updated_at = now()
         where user_id = $2`,
        [row.amount, userId],
      );
    }
  }

  const spends = await client.query<{ id: string; amount: number }>(
    `select id, amount from bonus_transactions
     where order_id = $1 and type = 'spend' and status = 'spent'`,
    [orderId],
  );

  for (const row of spends.rows) {
    await client.query(`update bonus_transactions set status = 'cancelled' where id = $1`, [row.id]);
    await client.query(
      `update bonus_accounts set balance_active = balance_active + $1, updated_at = now()
       where user_id = $2`,
      [row.amount, userId],
    );
    await client.query(
      `insert into bonus_transactions (user_id, order_id, type, amount, status, activated_at)
       values ($1, $2, 'refund', $3, 'active', now())`,
      [userId, orderId, row.amount],
    );
  }
}

async function restockOrderIfNeeded(client: PoolClient, orderId: string) {
  const already = await client.query(
    `select 1 from inventory_movements where order_id = $1 and reason = 'order_restocked' limit 1`,
    [orderId],
  );
  if (already.rowCount! > 0) return;

  const items = await client.query<{ product_id: string | null; quantity: number }>(
    `select product_id, quantity from order_items where order_id = $1`,
    [orderId],
  );

  for (const item of items.rows) {
    if (!item.product_id) continue;

    await client.query(`update products set stock = stock + $1, updated_at = now() where id = $2`, [
      item.quantity,
      item.product_id,
    ]);
    await client.query(
      `insert into inventory_movements (product_id, order_id, delta, reason, comment)
       values ($1, $2, $3, 'order_restocked', 'Возврат резерва: отмена/возврат заказа')`,
      [item.product_id, orderId, item.quantity],
    );
  }
}

export async function updateOrderStatus(
  adminId: string,
  orderId: string,
  status: string,
): Promise<{ ok: true } | { ok: false; error: "invalid-status" | "not-found" }> {
  if (!ORDER_STATUSES.has(status)) {
    return { ok: false, error: "invalid-status" };
  }

  const paymentStatus = derivePaymentStatus(status);

  return withTransaction(async (client) => {
    const updated = await client.query<{ id: string; user_id: string | null }>(
      `update orders set status = $1, payment_status = $2, delivery_status = $3,
       paid_at = case when $2 = 'paid' and paid_at is null then now() else paid_at end,
       updated_at = now()
       where id = $4
       returning id, user_id`,
      [status, paymentStatus, deriveDeliveryStatus(status), orderId],
    );

    if (updated.rowCount === 0) {
      return { ok: false, error: "not-found" };
    }

    const userId = updated.rows[0].user_id;

    if (status === "delivered") {
      await activateOrderBonuses(client, orderId, userId);
    }

    if (STOCK_RELEASE_STATUSES.has(status)) {
      await restockOrderIfNeeded(client, orderId);
      await reverseOrderBonuses(client, orderId, userId);
    }

    if (paymentStatus === "paid" && userId) {
      await recalculateLoyaltyLevel(client, userId);
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'order.status_update', 'order', $2, $3)`,
      [adminId, orderId, JSON.stringify({ status })],
    );

    return { ok: true };
  });
}

const CUSTOMER_CANCELLABLE_STATUSES = new Set(["pending_payment", "paid", "processing", "packed"]);

export async function cancelOrderByCustomer(
  userId: string,
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: "not-found" | "not-cancellable" }> {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string; user_id: string | null; status: string }>(
      `select id, user_id, status from orders where id = $1`,
      [orderId],
    );

    if (existing.rowCount === 0 || existing.rows[0].user_id !== userId) {
      return { ok: false, error: "not-found" };
    }

    if (!CUSTOMER_CANCELLABLE_STATUSES.has(existing.rows[0].status)) {
      return { ok: false, error: "not-cancellable" };
    }

    await client.query(
      `update orders set status = 'cancelled', payment_status = $1, delivery_status = $2, updated_at = now()
       where id = $3`,
      [derivePaymentStatus("cancelled"), deriveDeliveryStatus("cancelled"), orderId],
    );

    await restockOrderIfNeeded(client, orderId);
    await reverseOrderBonuses(client, orderId, userId);

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'order.customer_cancel', 'order', $2, '{}')`,
      [userId, orderId],
    );

    return { ok: true };
  });
}

export async function deleteOrder(
  adminId: string,
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: "not-found" }> {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string; user_id: string | null }>(
      `select id, user_id from orders where id = $1`,
      [orderId],
    );

    if (existing.rowCount === 0) {
      return { ok: false, error: "not-found" };
    }

    const userId = existing.rows[0].user_id;

    await restockOrderIfNeeded(client, orderId);
    await reverseOrderBonuses(client, orderId, userId);

    await client.query(`delete from orders where id = $1`, [orderId]);

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'order.delete', 'order', $2, '{}')`,
      [adminId, orderId],
    );

    return { ok: true };
  });
}

export async function updateOrderTracking(
  adminId: string,
  orderId: string,
  trackingNumber: string,
): Promise<{ ok: true } | { ok: false; error: "not-found" }> {
  return withTransaction(async (client) => {
    const updated = await client.query(
      `update orders set tracking_number = $1, updated_at = now() where id = $2 returning id`,
      [trackingNumber.trim() || null, orderId],
    );

    if (updated.rowCount === 0) {
      return { ok: false, error: "not-found" };
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'order.tracking_update', 'order', $2, $3)`,
      [adminId, orderId, JSON.stringify({ trackingNumber })],
    );

    return { ok: true };
  });
}

export async function getAllOrders(limit = 100): Promise<OrderSummary[]> {
  const rows = await query<OrderRow>(
    `select id, number, status, customer_name, customer_email, subtotal, discount,
            bonus_spent, bonus_earned, total, promo_code, payment_status, delivery_status,
            tracking_number, created_at
     from orders
     order by created_at desc
     limit $1`,
    [limit],
  );
  return rows.map(mapOrderRow);
}

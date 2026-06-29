import { query, queryOne, withTransaction } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export type BonusAccount = {
  userId: string;
  balancePending: number;
  balanceActive: number;
  loyaltyLevel: "silk" | "calm" | "sora";
};

type BonusAccountRow = {
  user_id: string;
  balance_pending: number;
  balance_active: number;
  loyalty_level: "silk" | "calm" | "sora";
};

export async function processBonusLifecycle(userId: string): Promise<void> {
  const settings = await getSettings();

  await withTransaction(async (client) => {
    const stalePending = await client.query<{ id: string; amount: number }>(
      `select bt.id, bt.amount from bonus_transactions bt
       join orders o on o.id = bt.order_id
       where bt.user_id = $1 and bt.type = 'accrual' and bt.status = 'pending'
         and o.paid_at is not null and o.paid_at <= now() - ($2 * interval '1 day')`,
      [userId, Math.trunc(settings.bonusPendingFallbackDays)],
    );

    for (const row of stalePending.rows) {
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

    const expired = await client.query<{ id: string; amount: number }>(
      `select id, amount from bonus_transactions
       where user_id = $1 and type = 'accrual' and status = 'active' and expires_at <= now()`,
      [userId],
    );

    for (const row of expired.rows) {
      await client.query(`update bonus_transactions set status = 'expired' where id = $1`, [row.id]);
      await client.query(
        `update bonus_accounts set balance_active = greatest(balance_active - $1, 0), updated_at = now()
         where user_id = $2`,
        [row.amount, userId],
      );
    }
  });
}

export async function getBonusAccount(userId: string): Promise<BonusAccount | null> {
  await processBonusLifecycle(userId);

  const row = await queryOne<BonusAccountRow>(
    `select user_id, balance_pending, balance_active, loyalty_level
     from bonus_accounts
     where user_id = $1`,
    [userId],
  );

  if (!row) return null;

  return {
    userId: row.user_id,
    balancePending: row.balance_pending,
    balanceActive: row.balance_active,
    loyaltyLevel: row.loyalty_level,
  };
}

export type BonusTransaction = {
  id: string;
  userId: string;
  userEmail?: string;
  orderId: string | null;
  orderNumber?: string | null;
  type: "accrual" | "activation" | "spend" | "refund" | "expire" | "manual";
  amount: number;
  status: "pending" | "active" | "spent" | "cancelled" | "expired";
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  adminComment: string | null;
};

type BonusTransactionRow = {
  id: string;
  user_id: string;
  user_email?: string;
  order_id: string | null;
  order_number?: string | null;
  type: BonusTransaction["type"];
  amount: number;
  status: BonusTransaction["status"];
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  admin_comment: string | null;
};

function mapTransactionRow(row: BonusTransactionRow): BonusTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    orderId: row.order_id,
    orderNumber: row.order_number,
    type: row.type,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    adminComment: row.admin_comment,
  };
}

export async function getBonusTransactionsByUser(
  userId: string,
  limit = 50,
): Promise<BonusTransaction[]> {
  const rows = await query<BonusTransactionRow>(
    `select bt.id, bt.user_id, bt.order_id, o.number as order_number, bt.type, bt.amount,
            bt.status, bt.created_at, bt.activated_at, bt.expires_at, bt.admin_comment
     from bonus_transactions bt
     left join orders o on o.id = bt.order_id
     where bt.user_id = $1
     order by bt.created_at desc
     limit $2`,
    [userId, limit],
  );
  return rows.map(mapTransactionRow);
}

export async function getRecentBonusTransactions(limit = 100): Promise<BonusTransaction[]> {
  const rows = await query<BonusTransactionRow>(
    `select bt.id, bt.user_id, u.email as user_email, bt.order_id, o.number as order_number,
            bt.type, bt.amount, bt.status, bt.created_at, bt.activated_at, bt.expires_at, bt.admin_comment
     from bonus_transactions bt
     join users u on u.id = bt.user_id
     left join orders o on o.id = bt.order_id
     order by bt.created_at desc
     limit $1`,
    [limit],
  );
  return rows.map(mapTransactionRow);
}

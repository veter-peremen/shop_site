import type { PoolClient } from "pg";

import { query, queryOne, withTransaction } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  balancePending: number;
  balanceActive: number;
  loyaltyLevel: string;
  ordersCount: number;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  balance_pending: number | null;
  balance_active: number | null;
  loyalty_level: string | null;
  orders_count: string;
};

function mapRow(row: UserRow): AdminUserRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    balancePending: row.balance_pending ?? 0,
    balanceActive: row.balance_active ?? 0,
    loyaltyLevel: row.loyalty_level ?? "silk",
    ordersCount: Number(row.orders_count ?? 0),
  };
}

export async function getAllUsers(limit = 200): Promise<AdminUserRow[]> {
  const rows = await query<UserRow>(
    `select u.id, u.email, u.name, u.phone, u.role, u.created_at,
            ba.balance_pending, ba.balance_active, ba.loyalty_level,
            count(o.id) as orders_count
     from users u
     left join bonus_accounts ba on ba.user_id = u.id
     left join orders o on o.user_id = u.id
     group by u.id, ba.balance_pending, ba.balance_active, ba.loyalty_level
     order by u.created_at desc
     limit $1`,
    [limit],
  );
  return rows.map(mapRow);
}

const VALID_ROLES = new Set(["customer", "admin", "manager", "content", "support"]);
const VALID_LEVELS = new Set(["silk", "calm", "sora"]);

export async function updateUserRole(
  adminId: string,
  userId: string,
  role: string,
): Promise<{ ok: true } | { ok: false; error: "invalid-role" | "not-found" }> {
  if (!VALID_ROLES.has(role)) {
    return { ok: false, error: "invalid-role" };
  }

  return withTransaction(async (client) => {
    const updated = await client.query(`update users set role = $1, updated_at = now() where id = $2 returning id`, [
      role,
      userId,
    ]);

    if (updated.rowCount === 0) {
      return { ok: false, error: "not-found" };
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'user.role_update', 'user', $2, $3)`,
      [adminId, userId, JSON.stringify({ role })],
    );

    return { ok: true };
  });
}

export async function updateUserLoyaltyLevel(
  adminId: string,
  userId: string,
  level: string,
): Promise<{ ok: true } | { ok: false; error: "invalid-level" }> {
  if (!VALID_LEVELS.has(level)) {
    return { ok: false, error: "invalid-level" };
  }

  return withTransaction(async (client) => {
    await client.query(
      `update bonus_accounts set loyalty_level = $1, updated_at = now() where user_id = $2`,
      [level, userId],
    );

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'user.loyalty_update', 'user', $2, $3)`,
      [adminId, userId, JSON.stringify({ level })],
    );

    return { ok: true };
  });
}

export async function adjustBonusBalance(
  adminId: string,
  userId: string,
  amount: number,
  comment: string,
): Promise<{ ok: true } | { ok: false; error: "invalid-amount" | "insufficient-balance" }> {
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "invalid-amount" };
  }

  return withTransaction(async (client) => {
    const account = await client.query<{ balance_active: number }>(
      `select balance_active from bonus_accounts where user_id = $1 for update`,
      [userId],
    );
    const balanceActive = account.rows[0]?.balance_active ?? 0;

    if (amount < 0 && balanceActive + amount < 0) {
      return { ok: false, error: "insufficient-balance" };
    }

    await client.query(
      `update bonus_accounts set balance_active = balance_active + $1, updated_at = now()
       where user_id = $2`,
      [amount, userId],
    );

    await client.query(
      `insert into bonus_transactions (user_id, type, amount, status, admin_comment)
       values ($1, 'manual', $2, 'active', $3)`,
      [userId, amount, comment],
    );

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'bonus.manual_adjustment', 'user', $2, $3)`,
      [adminId, userId, JSON.stringify({ amount, comment })],
    );

    return { ok: true };
  });
}

const LEVEL_RANK: Record<string, number> = { silk: 0, calm: 1, sora: 2 };

export async function recalculateLoyaltyLevel(client: PoolClient, userId: string): Promise<void> {
  const settings = await getSettings();

  const paidTotal = await client.query<{ sum: string | null }>(
    `select sum(total) as sum from orders where user_id = $1 and payment_status = 'paid'`,
    [userId],
  );
  const total = Number(paidTotal.rows[0]?.sum ?? 0);

  const targetLevel =
    total >= settings.loyaltyThresholds.sora
      ? "sora"
      : total >= settings.loyaltyThresholds.calm
        ? "calm"
        : "silk";

  const account = await client.query<{ loyalty_level: string }>(
    `select loyalty_level from bonus_accounts where user_id = $1`,
    [userId],
  );
  const currentLevel = account.rows[0]?.loyalty_level ?? "silk";

  if (LEVEL_RANK[targetLevel] > LEVEL_RANK[currentLevel]) {
    await client.query(
      `update bonus_accounts set loyalty_level = $1, updated_at = now() where user_id = $2`,
      [targetLevel, userId],
    );
  }
}

export async function getUserById(id: string) {
  return queryOne<UserRow>(
    `select u.id, u.email, u.name, u.phone, u.role, u.created_at,
            ba.balance_pending, ba.balance_active, ba.loyalty_level,
            0 as orders_count
     from users u
     left join bonus_accounts ba on ba.user_id = u.id
     where u.id = $1`,
    [id],
  );
}

export type NotificationPreferences = {
  emailNotificationsEnabled: boolean;
  telegramNotificationsEnabled: boolean;
};

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await queryOne<{ email_notifications_enabled: boolean; telegram_notifications_enabled: boolean }>(
    `select email_notifications_enabled, telegram_notifications_enabled from users where id = $1`,
    [userId],
  );

  return {
    emailNotificationsEnabled: row?.email_notifications_enabled ?? true,
    telegramNotificationsEnabled: row?.telegram_notifications_enabled ?? true,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  await query(
    `update users set
       email_notifications_enabled = coalesce($1, email_notifications_enabled),
       telegram_notifications_enabled = coalesce($2, telegram_notifications_enabled),
       updated_at = now()
     where id = $3`,
    [patch.emailNotificationsEnabled ?? null, patch.telegramNotificationsEnabled ?? null, userId],
  );

  return getNotificationPreferences(userId);
}

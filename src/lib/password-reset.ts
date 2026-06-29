import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { siteConfig } from "@/config/site";
import { query, queryOne, withTransaction } from "@/lib/db";

const TOKEN_TTL_MS = 60 * 60 * 1000;

type TokenRow = {
  user_id: string;
  expires_at: string;
  used_at: string | null;
};

export async function requestPasswordReset(email: string, locale: string): Promise<void> {
  const user = await queryOne<{ id: string }>(`select id from users where email = $1`, [
    email.toLowerCase(),
  ]);

  if (!user) return;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await query(
    `insert into password_reset_tokens (token, user_id, expires_at) values ($1, $2, $3)`,
    [token, user.id, expiresAt],
  );

  const link = `${siteConfig.url}/${locale}/reset-password?token=${token}`;

  await query(
    `insert into audit_logs (admin_id, action, entity, entity_id, payload)
     values (null, 'auth.password_reset_requested', 'user', $1, $2)`,
    [user.id, JSON.stringify({ email: email.toLowerCase(), link })],
  );
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: "invalid-token" }> {
  const row = await queryOne<TokenRow>(
    `select user_id, expires_at, used_at from password_reset_tokens where token = $1`,
    [token],
  );

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "invalid-token" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await withTransaction(async (client) => {
    await client.query(`update users set password_hash = $1, updated_at = now() where id = $2`, [
      passwordHash,
      row.user_id,
    ]);
    await client.query(`update password_reset_tokens set used_at = now() where token = $1`, [token]);
    await client.query(`delete from sessions where user_id = $1`, [row.user_id]);
    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values (null, 'auth.password_reset_completed', 'user', $1, '{}')`,
      [row.user_id],
    );
  });

  return { ok: true, userId: row.user_id };
}

import { randomBytes } from "node:crypto";

import { siteConfig } from "@/config/site";
import { query, queryOne } from "@/lib/db";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type TokenRow = {
  user_id: string;
  expires_at: string;
  used_at: string | null;
};

export async function createEmailVerificationToken(userId: string, locale: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await query(
    `insert into email_verification_tokens (token, user_id, expires_at) values ($1, $2, $3)`,
    [token, userId, expiresAt],
  );

  const link = `${siteConfig.url}/${locale}/verify-email?token=${token}`;

  await query(
    `insert into audit_logs (admin_id, action, entity, entity_id, payload)
     values ($1, 'auth.email_verification_requested', 'user', $2, $3)`,
    [userId, userId, JSON.stringify({ link })],
  );

  return link;
}

export async function verifyEmailToken(
  token: string,
): Promise<{ ok: true } | { ok: false; error: "invalid-token" }> {
  const row = await queryOne<TokenRow>(
    `select user_id, expires_at, used_at from email_verification_tokens where token = $1`,
    [token],
  );

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "invalid-token" };
  }

  await query(`update users set email_verified_at = now() where id = $1`, [row.user_id]);
  await query(`update email_verification_tokens set used_at = now() where token = $1`, [token]);
  await query(
    `insert into audit_logs (admin_id, action, entity, entity_id, payload)
     values ($1, 'auth.email_verified', 'user', $2, '{}')`,
    [row.user_id, row.user_id],
  );

  return { ok: true };
}

import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { query, queryOne, withTransaction } from "@/lib/db";

export const SESSION_COOKIE = "sonkei_session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  emailVerifiedAt: string | null;
};

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  email_verified_at: string | null;
};

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}): Promise<{ ok: true; user: SessionUser } | { ok: false; error: "email-taken" }> {
  const existing = await queryOne<{ id: string }>(`select id from users where email = $1`, [
    input.email.toLowerCase(),
  ]);

  if (existing) {
    return { ok: false, error: "email-taken" };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await withTransaction(async (client) => {
    const inserted = await client.query<UserRow>(
      `insert into users (email, password_hash, name, phone, role)
       values ($1, $2, $3, $4, 'customer')
       returning id, email, password_hash, name, phone, role, email_verified_at`,
      [input.email.toLowerCase(), passwordHash, input.name ?? null, input.phone ?? null],
    );
    const row = inserted.rows[0];

    await client.query(
      `insert into bonus_accounts (user_id, balance_pending, balance_active, loyalty_level)
       values ($1, 0, 0, 'silk')
       on conflict (user_id) do nothing`,
      [row.id],
    );

    return row;
  });

  return { ok: true, user: toSessionUser(user) };
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const row = await queryOne<UserRow>(
    `select id, email, password_hash, name, phone, role, email_verified_at from users where email = $1`,
    [email.toLowerCase()],
  );

  if (!row || !row.password_hash) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;

  return toSessionUser(row);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(`insert into sessions (token, user_id, expires_at) values ($1, $2, $3)`, [
    token,
    userId,
    expiresAt,
  ]);

  return token;
}

export async function destroySession(token: string) {
  await query(`delete from sessions where token = $1`, [token]);
}

export async function getUserBySessionToken(token: string): Promise<SessionUser | null> {
  const row = await queryOne<UserRow>(
    `select u.id, u.email, u.password_hash, u.name, u.phone, u.role, u.email_verified_at
     from sessions s
     join users u on u.id = s.user_id
     where s.token = $1 and s.expires_at > now()`,
    [token],
  );

  return row ? toSessionUser(row) : null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    emailVerifiedAt: row.email_verified_at,
  };
}

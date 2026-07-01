import dns from "node:dns";
import net from "node:net";
import { Pool, type QueryResultRow } from "pg";

// Force IPv4: Docker containers on many VPS providers lack IPv6 routing.
// Node.js 22 uses happy eyeballs (tries IPv6 + IPv4 simultaneously) which
// causes ENETUNREACH errors when the container has no IPv6 route.
dns.setDefaultResultOrder("ipv4first");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(net as any).setDefaultAutoSelectFamily?.(false);

declare global {
  var __sonkeiPgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to your environment (Neon connection string).");
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  });
}

export const pool = globalThis.__sonkeiPgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__sonkeiPgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

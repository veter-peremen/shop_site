import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

import "./load-env.mjs";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local.");
}

const schemaPath = path.join(process.cwd(), "db", "schema.sql");
const sql = await fs.readFile(schemaPath, "utf8");

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

try {
  await pool.query(sql);
  console.log("Schema applied successfully.");
} finally {
  await pool.end();
}

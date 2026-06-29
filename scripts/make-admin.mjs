import process from "node:process";
import pg from "pg";

import "./load-env.mjs";

const { Pool } = pg;

const email = process.argv[2];

if (!email) {
  throw new Error("Usage: node scripts/make-admin.mjs <email>");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local.");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

try {
  const result = await pool.query(
    `update users set role = 'admin' where email = $1 returning email`,
    [email.toLowerCase()],
  );

  if (result.rowCount === 0) {
    console.log(`No user found with email ${email}. Register the account first, then rerun this script.`);
  } else {
    console.log(`${result.rows[0].email} is now an admin.`);
  }
} finally {
  await pool.end();
}

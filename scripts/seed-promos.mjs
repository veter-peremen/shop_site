import process from "node:process";
import pg from "pg";

import "./load-env.mjs";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local.");
}

const promoCodes = [
  {
    code: "SONKEI10",
    discountType: "percent",
    value: 10,
    minSubtotal: 2500,
  },
  {
    code: "SOFT500",
    discountType: "fixed",
    value: 500,
    minSubtotal: 5000,
  },
];

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

try {
  for (const promo of promoCodes) {
    await pool.query(
      `insert into promo_codes (code, discount_type, value, min_subtotal)
       values ($1, $2, $3, $4)
       on conflict (code) do update set
         discount_type = excluded.discount_type,
         value = excluded.value,
         min_subtotal = excluded.min_subtotal`,
      [promo.code, promo.discountType, promo.value, promo.minSubtotal],
    );
  }

  console.log(`Seeded ${promoCodes.length} promo codes.`);
} finally {
  await pool.end();
}

import process from "node:process";
import pg from "pg";

import "./load-env.mjs";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local.");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

const sampleComments = [
  { rating: 5, comment: "Мягкость и посадка отличные, ребёнку комфортно всю ночь.", isPublished: true },
  { rating: 5, comment: "Хорошо держат, протечек не было ни разу.", isPublished: true },
  { rating: 4, comment: "Фото-отзыв: упаковка пришла слегка примятая, но товар в порядке.", isPublished: false },
];

try {
  const products = await pool.query(`select id from products order by created_at asc limit 3`);

  if (products.rows.length === 0) {
    console.log("No products found. Run db:seed first.");
  } else {
    for (let i = 0; i < products.rows.length; i += 1) {
      const productId = products.rows[i].id;
      const sample = sampleComments[i % sampleComments.length];
      await pool.query(
        `insert into reviews (product_id, rating, comment, is_published)
         values ($1, $2, $3, $4)`,
        [productId, sample.rating, sample.comment, sample.isPublished],
      );
    }
    console.log(`Seeded ${products.rows.length} sample reviews.`);
  }
} finally {
  await pool.end();
}

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

const productsPath = path.join(process.cwd(), "src", "data", "products.json");
const products = JSON.parse(await fs.readFile(productsPath, "utf8"));

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

const upsertSql = `
  insert into products (
    id, slug, sku, wb_id, barcode, brand, category, line, stage, size, weight_range, count,
    name_ru, name_en, short_ru, short_en, description_ru, description_en, color, images, video,
    price, old_price, bonus_points, rating, reviews_count, stock, dimensions, specs, tags
  ) values (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
    $13, $14, $15, $16, $17, $18, $19, $20, $21,
    $22, $23, $24, $25, $26, $27, $28, $29, $30
  )
  on conflict (id) do update set
    slug = excluded.slug,
    sku = excluded.sku,
    wb_id = excluded.wb_id,
    barcode = excluded.barcode,
    brand = excluded.brand,
    category = excluded.category,
    line = excluded.line,
    stage = excluded.stage,
    size = excluded.size,
    weight_range = excluded.weight_range,
    count = excluded.count,
    name_ru = excluded.name_ru,
    name_en = excluded.name_en,
    short_ru = excluded.short_ru,
    short_en = excluded.short_en,
    description_ru = excluded.description_ru,
    description_en = excluded.description_en,
    color = excluded.color,
    images = excluded.images,
    video = excluded.video,
    price = excluded.price,
    old_price = excluded.old_price,
    bonus_points = excluded.bonus_points,
    rating = excluded.rating,
    reviews_count = excluded.reviews_count,
    stock = excluded.stock,
    dimensions = excluded.dimensions,
    specs = excluded.specs,
    tags = excluded.tags,
    updated_at = now();
`;

try {
  for (const product of products) {
    await pool.query(upsertSql, [
      product.id,
      product.slug,
      product.sku,
      product.wbId,
      product.barcode,
      product.brand,
      product.category,
      product.line,
      product.stage,
      product.size,
      product.weightRange,
      product.count,
      product.nameRu,
      product.nameEn,
      product.shortRu,
      product.shortEn,
      product.descriptionRu,
      product.descriptionEn,
      product.color,
      product.images,
      product.video,
      product.price,
      product.oldPrice,
      product.bonusPoints,
      product.rating,
      product.reviewsCount,
      product.stock,
      JSON.stringify(product.dimensions),
      JSON.stringify(product.specs),
      product.tags,
    ]);
  }

  console.log(`Seeded ${products.length} products into the database.`);
} finally {
  await pool.end();
}

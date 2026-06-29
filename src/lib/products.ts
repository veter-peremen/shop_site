import { query, queryOne } from "@/lib/db";
import type { Product } from "@/types/product";

type ProductRow = {
  id: string;
  slug: string;
  sku: string;
  wb_id: string;
  barcode: string;
  brand: string;
  category: string;
  line: string;
  stage: number | null;
  size: string;
  weight_range: string;
  count: number;
  name_ru: string;
  name_en: string;
  short_ru: string;
  short_en: string;
  description_ru: string;
  description_en: string;
  color: string;
  images: string[];
  video: string | null;
  price: number;
  old_price: number;
  bonus_points: number;
  rating: string;
  reviews_count: number;
  stock: number;
  dimensions: Product["dimensions"];
  specs: Product["specs"];
  tags: string[];
};

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    wbId: row.wb_id,
    barcode: row.barcode,
    brand: row.brand,
    category: row.category as Product["category"],
    line: row.line as Product["line"],
    stage: row.stage,
    size: row.size,
    weightRange: row.weight_range,
    count: row.count,
    nameRu: row.name_ru,
    nameEn: row.name_en,
    shortRu: row.short_ru,
    shortEn: row.short_en,
    descriptionRu: row.description_ru,
    descriptionEn: row.description_en,
    color: row.color,
    images: row.images ?? [],
    video: row.video,
    price: row.price,
    oldPrice: row.old_price,
    bonusPoints: row.bonus_points,
    rating: Number(row.rating),
    reviewsCount: row.reviews_count,
    stock: row.stock,
    dimensions: row.dimensions,
    specs: row.specs,
    tags: row.tags ?? [],
  };
}

const SELECT_ACTIVE_PRODUCTS = `
  select id, slug, sku, wb_id, barcode, brand, category, line, stage, size, weight_range, count,
         name_ru, name_en, short_ru, short_en, description_ru, description_en, color, images, video,
         price, old_price, bonus_points, rating, reviews_count, stock, dimensions, specs, tags
  from products
  where is_active = true
`;

export async function getAllProducts(): Promise<Product[]> {
  const rows = await query<ProductRow>(`${SELECT_ACTIVE_PRODUCTS} order by created_at asc`);
  return rows.map(mapRow);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const row = await queryOne<ProductRow>(`${SELECT_ACTIVE_PRODUCTS} and slug = $1`, [slug]);
  return row ? mapRow(row) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const row = await queryOne<ProductRow>(`${SELECT_ACTIVE_PRODUCTS} and id = $1`, [id]);
  return row ? mapRow(row) : null;
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const rows = await query<ProductRow>(
    `${SELECT_ACTIVE_PRODUCTS} and id <> $1
     order by
       (category = $2)::int +
       (line = $3)::int +
       (size = $4)::int desc,
       created_at asc
     limit $5`,
    [product.id, product.category, product.line, product.size, limit],
  );
  return rows.map(mapRow);
}

export async function getProductFacets() {
  const [sizes, lines, categories] = await Promise.all([
    query<{ size: string }>(`select distinct size from products where is_active = true order by size`),
    query<{ line: string }>(`select distinct line from products where is_active = true order by line`),
    query<{ category: string }>(
      `select distinct category from products where is_active = true order by category`,
    ),
  ]);

  return {
    sizes: sizes.map((row) => row.size),
    lines: lines.map((row) => row.line) as Product["line"][],
    categories: categories.map((row) => row.category) as Product["category"][],
  };
}

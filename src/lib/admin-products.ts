import * as XLSX from "xlsx";
import { z } from "zod";

import { query, queryOne, withTransaction } from "@/lib/db";
import type { Product } from "@/types/product";

export type AdminProduct = Product & {
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

type AdminProductRow = {
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
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

function mapRow(row: AdminProductRow): AdminProduct {
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
    isActive: row.is_active,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

const ADMIN_PRODUCT_COLUMNS = `
  id, slug, sku, wb_id, barcode, brand, category, line, stage, size, weight_range, count,
  name_ru, name_en, short_ru, short_en, description_ru, description_en, color, images, video,
  price, old_price, bonus_points, rating, reviews_count, stock, dimensions, specs, tags,
  is_active, seo_title, seo_description
`;

export async function getAllProductsForAdmin(): Promise<AdminProduct[]> {
  const rows = await query<AdminProductRow>(
    `select ${ADMIN_PRODUCT_COLUMNS} from products order by created_at desc`,
  );
  return rows.map(mapRow);
}

export const createProductSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with dashes"),
  sku: z.string().trim().optional(),
  category: z.enum(["pants", "diapers"]),
  line: z.enum(["premium", "ultrathin", "daily"]),
  size: z.string().trim().min(1),
  weightRange: z.string().trim().optional(),
  count: z.number().int().positive(),
  nameRu: z.string().trim().min(1),
  nameEn: z.string().trim().min(1),
  shortRu: z.string().trim().optional(),
  shortEn: z.string().trim().optional(),
  descriptionRu: z.string().trim().optional(),
  descriptionEn: z.string().trim().optional(),
  price: z.number().int().nonnegative(),
  oldPrice: z.number().int().nonnegative().optional(),
  bonusPoints: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  images: z.array(z.string().url()).optional(),
  seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export async function createProduct(
  adminId: string,
  input: CreateProductInput,
): Promise<AdminProduct> {
  const id = `sonkei-${input.slug}`;

  return withTransaction(async (client) => {
    const inserted = await client.query<AdminProductRow>(
      `insert into products (
        id, slug, sku, category, line, size, weight_range, count,
        name_ru, name_en, short_ru, short_en, description_ru, description_en,
        price, old_price, bonus_points, stock, images, seo_title, seo_description
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21
      ) returning ${ADMIN_PRODUCT_COLUMNS}`,
      [
        id,
        input.slug,
        input.sku ?? null,
        input.category,
        input.line,
        input.size,
        input.weightRange ?? null,
        input.count,
        input.nameRu,
        input.nameEn,
        input.shortRu ?? null,
        input.shortEn ?? null,
        input.descriptionRu ?? null,
        input.descriptionEn ?? null,
        input.price,
        input.oldPrice ?? null,
        input.bonusPoints ?? 0,
        input.stock ?? 0,
        input.images ?? [],
        input.seoTitle ?? null,
        input.seoDescription ?? null,
      ],
    );

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'product.create', 'product', $2, $3)`,
      [adminId, id, JSON.stringify(input)],
    );

    return mapRow(inserted.rows[0]);
  });
}

const FIELD_TO_COLUMN: Record<keyof UpdateProductInput, string> = {
  slug: "slug",
  sku: "sku",
  category: "category",
  line: "line",
  size: "size",
  weightRange: "weight_range",
  count: "count",
  nameRu: "name_ru",
  nameEn: "name_en",
  shortRu: "short_ru",
  shortEn: "short_en",
  descriptionRu: "description_ru",
  descriptionEn: "description_en",
  price: "price",
  oldPrice: "old_price",
  bonusPoints: "bonus_points",
  stock: "stock",
  images: "images",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
  isActive: "is_active",
};

export async function updateProduct(
  adminId: string,
  id: string,
  input: UpdateProductInput,
): Promise<AdminProduct | null> {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined) as Array<
    [keyof UpdateProductInput, unknown]
  >;

  if (entries.length === 0) {
    const row = await queryOne<AdminProductRow>(
      `select ${ADMIN_PRODUCT_COLUMNS} from products where id = $1`,
      [id],
    );
    return row ? mapRow(row) : null;
  }

  const setClauses = entries.map(([field], index) => `${FIELD_TO_COLUMN[field]} = $${index + 2}`);
  const values = entries.map(([, value]) => value);

  return withTransaction(async (client) => {
    const updated = await client.query<AdminProductRow>(
      `update products set ${setClauses.join(", ")}, updated_at = now()
       where id = $1
       returning ${ADMIN_PRODUCT_COLUMNS}`,
      [id, ...values],
    );

    if (updated.rowCount === 0) {
      return null;
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'product.update', 'product', $2, $3)`,
      [adminId, id, JSON.stringify(input)],
    );

    return mapRow(updated.rows[0]);
  });
}

export async function deleteProduct(
  adminId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: "not-found" | "has-orders" }> {
  return withTransaction(async (client) => {
    await client.query(`delete from cart_items where product_id = $1`, [id]);

    try {
      const deleted = await client.query(`delete from products where id = $1 returning id`, [id]);

      if (deleted.rowCount === 0) {
        return { ok: false, error: "not-found" as const };
      }
    } catch (error) {
      if ((error as { code?: string }).code === "23503") {
        return { ok: false, error: "has-orders" as const };
      }
      throw error;
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'product.delete', 'product', $2, '{}')`,
      [adminId, id],
    );

    return { ok: true };
  });
}

const EXPORT_COLUMNS = [
  "id",
  "slug",
  "sku",
  "category",
  "line",
  "size",
  "count",
  "nameRu",
  "nameEn",
  "price",
  "oldPrice",
  "bonusPoints",
  "stock",
  "isActive",
  "seoTitle",
  "seoDescription",
] as const;

export async function exportProductsWorkbook(): Promise<Buffer> {
  const products = await getAllProductsForAdmin();
  const rows = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    category: product.category,
    line: product.line,
    size: product.size,
    count: product.count,
    nameRu: product.nameRu,
    nameEn: product.nameEn,
    price: product.price,
    oldPrice: product.oldPrice,
    bonusPoints: product.bonusPoints,
    stock: product.stock,
    isActive: product.isActive,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...EXPORT_COLUMNS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const importRowSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  sku: z.string().optional(),
  category: z.enum(["pants", "diapers"]).optional(),
  line: z.enum(["premium", "ultrathin", "daily"]).optional(),
  size: z.string().optional(),
  count: z.coerce.number().int().positive().optional(),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  price: z.coerce.number().int().nonnegative().optional(),
  oldPrice: z.coerce.number().int().nonnegative().optional(),
  bonusPoints: z.coerce.number().int().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  isActive: z.coerce.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export type ImportResult = {
  updated: number;
  skipped: Array<{ row: number; reason: string }>;
};

export async function importProductsFromWorkbook(
  adminId: string,
  buffer: Buffer,
): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet);

  const result: ImportResult = { updated: 0, skipped: [] };

  for (let index = 0; index < rawRows.length; index += 1) {
    const parsed = importRowSchema.safeParse(rawRows[index]);

    if (!parsed.success) {
      result.skipped.push({ row: index + 2, reason: "invalid-row" });
      continue;
    }

    const { slug, ...rest } = parsed.data;
    const existing = await queryOne<{ id: string }>(`select id from products where slug = $1`, [slug]);

    if (!existing) {
      result.skipped.push({ row: index + 2, reason: "slug-not-found" });
      continue;
    }

    const update = updateProductSchema.safeParse(rest);
    if (!update.success) {
      result.skipped.push({ row: index + 2, reason: "invalid-fields" });
      continue;
    }

    await updateProduct(adminId, existing.id, update.data);
    result.updated += 1;
  }

  return result;
}

import { query, queryOne, withTransaction } from "@/lib/db";

export type PromoCode = {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  combinableWithBonuses: boolean;
  isActive: boolean;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  allowedCategories: string[] | null;
  allowedProducts: string[] | null;
  startsAt: string | null;
  endsAt: string | null;
  timesUsed: number;
};

type PromoRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  combinable_with_bonuses: boolean;
  is_active: boolean;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  allowed_categories: string[] | null;
  allowed_products: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  times_used?: string;
};

function mapRow(row: PromoRow): PromoCode {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    value: row.value,
    minSubtotal: row.min_subtotal,
    combinableWithBonuses: row.combinable_with_bonuses,
    isActive: row.is_active,
    usageLimit: row.usage_limit,
    usageLimitPerUser: row.usage_limit_per_user,
    allowedCategories: row.allowed_categories,
    allowedProducts: row.allowed_products,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timesUsed: Number(row.times_used ?? 0),
  };
}

export async function getActivePromoCodes(): Promise<PromoCode[]> {
  const rows = await query<PromoRow>(
    `select id, code, discount_type, value, min_subtotal, combinable_with_bonuses,
            is_active, usage_limit, usage_limit_per_user, allowed_categories, allowed_products,
            starts_at, ends_at
     from promo_codes
     where is_active = true
     order by created_at asc`,
  );
  return rows.map(mapRow);
}

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const rows = await query<PromoRow>(
    `select p.id, p.code, p.discount_type, p.value, p.min_subtotal, p.combinable_with_bonuses,
            p.is_active, p.usage_limit, p.usage_limit_per_user, p.allowed_categories, p.allowed_products,
            p.starts_at, p.ends_at,
            count(u.id) as times_used
     from promo_codes p
     left join promo_code_usages u on u.promo_code_id = p.id
     group by p.id
     order by p.created_at desc`,
  );
  return rows.map(mapRow);
}

export async function createPromoCode(
  adminId: string,
  input: {
    code: string;
    discountType: "percent" | "fixed";
    value: number;
    minSubtotal: number;
    usageLimit?: number | null;
    usageLimitPerUser?: number | null;
    combinableWithBonuses?: boolean;
    allowedCategories?: string[] | null;
    allowedProducts?: string[] | null;
    startsAt?: string | null;
    endsAt?: string | null;
  },
): Promise<PromoCode> {
  const row = await queryOne<PromoRow>(
    `insert into promo_codes (code, discount_type, value, min_subtotal, usage_limit, usage_limit_per_user, combinable_with_bonuses, allowed_categories, allowed_products, starts_at, ends_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning id, code, discount_type, value, min_subtotal, combinable_with_bonuses,
               is_active, usage_limit, usage_limit_per_user, allowed_categories, allowed_products,
               starts_at, ends_at`,
    [
      input.code.trim().toUpperCase(),
      input.discountType,
      input.value,
      input.minSubtotal,
      input.usageLimit ?? null,
      input.usageLimitPerUser ?? null,
      input.combinableWithBonuses ?? true,
      input.allowedCategories?.length ? input.allowedCategories : null,
      input.allowedProducts?.length ? input.allowedProducts : null,
      input.startsAt ?? null,
      input.endsAt ?? null,
    ],
  );
  const promoCode = mapRow(row!);

  await query(
    `insert into audit_logs (admin_id, action, entity, entity_id, payload)
     values ($1, 'promo.create', 'promo_code', $2, $3)`,
    [adminId, promoCode.id, JSON.stringify(input)],
  );

  return promoCode;
}

export async function setPromoCodeActive(adminId: string, id: string, isActive: boolean): Promise<void> {
  await query(`update promo_codes set is_active = $1 where id = $2`, [isActive, id]);

  await query(
    `insert into audit_logs (admin_id, action, entity, entity_id, payload)
     values ($1, 'promo.toggle_active', 'promo_code', $2, $3)`,
    [adminId, id, JSON.stringify({ isActive })],
  );
}

export async function deletePromoCode(
  adminId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: "not-found" }> {
  return withTransaction(async (client) => {
    const deleted = await client.query(`delete from promo_codes where id = $1 returning id`, [id]);

    if (deleted.rowCount === 0) {
      return { ok: false, error: "not-found" };
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'promo.delete', 'promo_code', $2, '{}')`,
      [adminId, id],
    );

    return { ok: true };
  });
}

export async function validatePromo(
  code: string,
  subtotal: number,
  userId?: string | null,
  productIds: string[] = [],
) {
  const row = await queryOne<PromoRow>(
    `select id, code, discount_type, value, min_subtotal, combinable_with_bonuses,
            usage_limit, usage_limit_per_user, allowed_categories, allowed_products
     from promo_codes
     where code = $1
       and is_active = true
       and (starts_at is null or starts_at <= now())
       and (ends_at is null or ends_at >= now())`,
    [code.trim().toUpperCase()],
  );

  if (!row) {
    return { valid: false, promo: null, discount: 0, reason: "not-found" as const };
  }

  const promo = mapRow(row);

  if (subtotal < promo.minSubtotal) {
    return { valid: false, promo, discount: 0, reason: "min-subtotal" as const };
  }

  if (promo.usageLimit !== null) {
    const totalUsed = await queryOne<{ count: string }>(
      `select count(*) from promo_code_usages where promo_code_id = $1`,
      [promo.id],
    );
    if (Number(totalUsed?.count ?? 0) >= promo.usageLimit) {
      return { valid: false, promo, discount: 0, reason: "usage-limit" as const };
    }
  }

  if (userId && promo.usageLimitPerUser !== null) {
    const userUsed = await queryOne<{ count: string }>(
      `select count(*) from promo_code_usages u
       join orders o on o.id = u.order_id
       where u.promo_code_id = $1 and o.user_id = $2`,
      [promo.id, userId],
    );
    if (Number(userUsed?.count ?? 0) >= promo.usageLimitPerUser) {
      return { valid: false, promo, discount: 0, reason: "usage-limit-per-user" as const };
    }
  }

  if (promo.allowedCategories?.length || promo.allowedProducts?.length) {
    const eligible = await queryOne<{ count: string }>(
      `select count(*) from products
       where id = any($1::text[])
         and (category = any($2::text[]) or id = any($3::text[]))`,
      [productIds, promo.allowedCategories ?? [], promo.allowedProducts ?? []],
    );
    if (Number(eligible?.count ?? 0) === 0) {
      return { valid: false, promo, discount: 0, reason: "not-eligible" as const };
    }
  }

  const rawDiscount =
    promo.discountType === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value;
  const discount = Math.min(rawDiscount, subtotal);

  return { valid: true, promo, discount, reason: null };
}

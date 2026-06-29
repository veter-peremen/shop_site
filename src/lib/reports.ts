import { query, queryOne } from "@/lib/db";

const PAID_STATUSES = ["paid", "processing", "packed", "shipped", "delivered"];

export type SalesReport = {
  from: string;
  to: string;
  ordersCount: number;
  paidOrdersCount: number;
  revenue: number;
  averageOrderValue: number;
  bonusIssued: number;
  bonusSpent: number;
  promoUsageCount: number;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
};

export async function getSalesReport(from: string, to: string): Promise<SalesReport> {
  const summary = await queryOne<{
    orders_count: string;
    paid_orders_count: string;
    revenue: string | null;
    bonus_issued: string | null;
    bonus_spent: string | null;
    promo_usage_count: string;
  }>(
    `select
       count(*) as orders_count,
       count(*) filter (where status = any($3)) as paid_orders_count,
       coalesce(sum(total) filter (where status = any($3)), 0) as revenue,
       coalesce(sum(bonus_earned) filter (where status = any($3)), 0) as bonus_issued,
       coalesce(sum(bonus_spent), 0) as bonus_spent,
       count(*) filter (where promo_code is not null) as promo_usage_count
     from orders
     where status <> 'draft'
       and created_at >= $1
       and created_at < $2::date + interval '1 day'`,
    [from, to, PAID_STATUSES],
  );

  const ordersCount = Number(summary?.orders_count ?? 0);
  const paidOrdersCount = Number(summary?.paid_orders_count ?? 0);
  const revenue = Number(summary?.revenue ?? 0);

  const topProductRows = await query<{
    product_id: string;
    name_ru: string;
    quantity: string;
    revenue: string;
  }>(
    `select oi.product_id, oi.name_ru, sum(oi.quantity) as quantity, sum(oi.price * oi.quantity) as revenue
     from order_items oi
     join orders o on o.id = oi.order_id
     where o.status = any($3)
       and o.created_at >= $1
       and o.created_at < $2::date + interval '1 day'
     group by oi.product_id, oi.name_ru
     order by revenue desc
     limit 10`,
    [from, to, PAID_STATUSES],
  );

  return {
    from,
    to,
    ordersCount,
    paidOrdersCount,
    revenue,
    averageOrderValue: paidOrdersCount > 0 ? Math.round(revenue / paidOrdersCount) : 0,
    bonusIssued: Number(summary?.bonus_issued ?? 0),
    bonusSpent: Number(summary?.bonus_spent ?? 0),
    promoUsageCount: Number(summary?.promo_usage_count ?? 0),
    topProducts: topProductRows.map((row) => ({
      productId: row.product_id,
      name: row.name_ru,
      quantity: Number(row.quantity),
      revenue: Number(row.revenue),
    })),
  };
}

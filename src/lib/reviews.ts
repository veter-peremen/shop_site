import { query, withTransaction } from "@/lib/db";

export type Review = {
  id: string;
  productId: string;
  productName: string;
  userEmail: string | null;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  createdAt: string;
};

type ReviewRow = {
  id: string;
  product_id: string;
  name_ru: string;
  user_email: string | null;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at: string;
};

function mapRow(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.name_ru,
    userEmail: row.user_email,
    rating: row.rating,
    comment: row.comment,
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

export async function getAllReviews(limit = 200): Promise<Review[]> {
  const rows = await query<ReviewRow>(
    `select r.id, r.product_id, p.name_ru, u.email as user_email, r.rating, r.comment,
            r.is_published, r.created_at
     from reviews r
     join products p on p.id = r.product_id
     left join users u on u.id = r.user_id
     order by r.created_at desc
     limit $1`,
    [limit],
  );
  return rows.map(mapRow);
}

export async function getPublishedReviewsForProduct(productId: string): Promise<Review[]> {
  const rows = await query<ReviewRow>(
    `select r.id, r.product_id, p.name_ru, u.email as user_email, r.rating, r.comment,
            r.is_published, r.created_at
     from reviews r
     join products p on p.id = r.product_id
     left join users u on u.id = r.user_id
     where r.product_id = $1 and r.is_published = true
     order by r.created_at desc`,
    [productId],
  );
  return rows.map(mapRow);
}

export async function createOrUpdateReview(
  userId: string,
  productId: string,
  rating: number,
  comment: string | null,
): Promise<{ ok: true } | { ok: false; error: "invalid-rating" | "not-found" }> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "invalid-rating" };
  }

  const product = await query<{ id: string }>(`select id from products where id = $1`, [productId]);
  if (product.length === 0) {
    return { ok: false, error: "not-found" };
  }

  await query(
    `insert into reviews (product_id, user_id, rating, comment, is_published)
     values ($1, $2, $3, $4, false)
     on conflict (product_id, user_id) where user_id is not null
     do update set rating = excluded.rating, comment = excluded.comment, is_published = false, created_at = now()`,
    [productId, userId, rating, comment],
  );

  return { ok: true };
}

export async function deleteReview(
  adminId: string,
  reviewId: string,
): Promise<{ ok: true } | { ok: false; error: "not-found" }> {
  return withTransaction(async (client) => {
    const deleted = await client.query(`delete from reviews where id = $1 returning id`, [reviewId]);

    if (deleted.rowCount === 0) {
      return { ok: false, error: "not-found" };
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'review.delete', 'review', $2, '{}')`,
      [adminId, reviewId],
    );

    return { ok: true };
  });
}

export async function setReviewPublished(
  adminId: string,
  reviewId: string,
  isPublished: boolean,
): Promise<{ ok: true } | { ok: false; error: "not-found" }> {
  return withTransaction(async (client) => {
    const updated = await client.query(
      `update reviews set is_published = $1 where id = $2 returning id`,
      [isPublished, reviewId],
    );

    if (updated.rowCount === 0) {
      return { ok: false, error: "not-found" };
    }

    await client.query(
      `insert into audit_logs (admin_id, action, entity, entity_id, payload)
       values ($1, 'review.moderation', 'review', $2, $3)`,
      [adminId, reviewId, JSON.stringify({ isPublished })],
    );

    return { ok: true };
  });
}

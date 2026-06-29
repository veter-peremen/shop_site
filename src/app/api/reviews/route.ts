import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createOrUpdateReview } from "@/lib/reviews";

const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`review:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  const body = await request.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const result = await createOrUpdateReview(
    user.id,
    parsed.data.productId,
    parsed.data.rating,
    parsed.data.comment?.trim() || null,
  );

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "not-found" ? 404 : 400 });
  }

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { validatePromo } from "@/lib/promos";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipLimit = rateLimit(`promo:ip:${ip}`, 30, 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : null;
  const subtotal = Number(body?.subtotal);
  const productIds = Array.isArray(body?.productIds)
    ? body.productIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const result = await validatePromo(code, subtotal, user?.id ?? null, productIds);
  return NextResponse.json(result);
}

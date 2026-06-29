import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { createOrder, type CreateOrderInput } from "@/lib/orders";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().finite(),
      }),
    )
    .min(1),
  customer: z.object({
    name: z.string().trim().min(1).max(255),
    phone: z.string().trim().min(1).max(50),
    email: z.string().trim().email().max(255),
    comment: z.string().trim().max(2000).optional(),
  }),
  delivery: z
    .object({
      city: z.string().trim().max(255).optional(),
      method: z.string().trim().max(50).optional(),
      address: z.string().trim().max(500).optional(),
      pickupPoint: z.string().trim().max(500).optional(),
      price: z.coerce.number().nonnegative().optional(),
    })
    .optional(),
  promoCode: z.string().trim().max(50).optional(),
  bonusSpent: z.coerce.number().nonnegative().optional(),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`checkout:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getCurrentUser();

  const input: CreateOrderInput = {
    userId: user?.id ?? null,
    items: parsed.data.items.map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.floor(item.quantity)),
    })),
    customer: parsed.data.customer,
    delivery: parsed.data.delivery,
    promoCode: parsed.data.promoCode,
    bonusSpent: parsed.data.bonusSpent,
  };

  if (input.items.length === 0) {
    return NextResponse.json({ error: "empty-cart" }, { status: 400 });
  }

  const result = await createOrder(input);

  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result);
}

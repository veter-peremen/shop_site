import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { createPromoCode, getAllPromoCodes } from "@/lib/promos";

const ADMIN_ROLES = new Set(["admin", "manager"]);

const createPromoSchema = z.object({
  code: z.string().trim().min(1).max(50),
  discountType: z.enum(["percent", "fixed"]).default("percent"),
  value: z.coerce.number().positive(),
  minSubtotal: z.coerce.number().nonnegative().default(0),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  usageLimitPerUser: z.coerce.number().int().positive().nullable().optional(),
  combinableWithBonuses: z.boolean().default(true),
  allowedCategories: z.array(z.string().trim().min(1)).nullable().optional(),
  allowedProducts: z.array(z.string().trim().min(1)).nullable().optional(),
  startsAt: z.string().trim().min(1).nullable().optional(),
  endsAt: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const promoCodes = await getAllPromoCodes();
  return NextResponse.json({ promoCodes });
}

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPromoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const promoCode = await createPromoCode(user.id, {
    code: parsed.data.code,
    discountType: parsed.data.discountType,
    value: Math.trunc(parsed.data.value),
    minSubtotal: Math.max(0, Math.trunc(parsed.data.minSubtotal)),
    usageLimit: parsed.data.usageLimit ?? null,
    usageLimitPerUser: parsed.data.usageLimitPerUser ?? null,
    combinableWithBonuses: parsed.data.combinableWithBonuses,
    allowedCategories: parsed.data.allowedCategories ?? null,
    allowedProducts: parsed.data.allowedProducts ?? null,
    startsAt: parsed.data.startsAt ?? null,
    endsAt: parsed.data.endsAt ?? null,
  });

  return NextResponse.json({ promoCode });
}

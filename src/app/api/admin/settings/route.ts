import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { getSettings, updateSettings } from "@/lib/settings";

const WRITE_ROLES = new Set(["admin"]);
const READ_ROLES = new Set(["admin", "manager"]);

const settingsPatchSchema = z.object({
  bonusLoyaltyRates: z
    .object({
      silk: z.number().min(0).max(100),
      calm: z.number().min(0).max(100),
      sora: z.number().min(0).max(100),
    })
    .partial()
    .optional(),
  loyaltyThresholds: z
    .object({
      calm: z.number().int().nonnegative(),
      sora: z.number().int().nonnegative(),
    })
    .partial()
    .optional(),
  bonusMaxSpendShare: z.number().min(0).max(1).optional(),
  bonusExpiryDays: z.number().int().positive().optional(),
  bonusPendingFallbackDays: z.number().int().positive().optional(),
  ndsRate: z.number().min(0).max(100).optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !READ_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !WRITE_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body", details: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await updateSettings(user.id, parsed.data);
  return NextResponse.json({ settings });
}

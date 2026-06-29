import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { adjustBonusBalance } from "@/lib/users";

const ADMIN_ROLES = new Set(["admin", "manager"]);

const bonusSchema = z.object({
  amount: z.coerce.number().finite().refine((value) => value !== 0),
  comment: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bonusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const { amount, comment } = parsed.data;

  const result = await adjustBonusBalance(user.id, id, Math.trunc(amount), comment);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}

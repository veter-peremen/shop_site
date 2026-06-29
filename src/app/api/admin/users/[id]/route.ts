import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { updateUserLoyaltyLevel, updateUserRole } from "@/lib/users";

const ADMIN_ROLES = new Set(["admin"]);

const patchSchema = z.union([
  z.object({ role: z.string().min(1) }),
  z.object({ loyaltyLevel: z.string().min(1) }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  if ("role" in parsed.data) {
    const result = await updateUserRole(user.id, id, parsed.data.role);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "not-found" ? 404 : 400 });
    }
    return NextResponse.json(result);
  }

  const result = await updateUserLoyaltyLevel(user.id, id, parsed.data.loyaltyLevel);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}

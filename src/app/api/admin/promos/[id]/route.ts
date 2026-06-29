import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { deletePromoCode, setPromoCodeActive } from "@/lib/promos";

const ADMIN_ROLES = new Set(["admin", "manager"]);

const patchSchema = z.object({ isActive: z.boolean() });

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

  await setPromoCodeActive(user.id, id, parsed.data.isActive);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deletePromoCode(user.id, id);

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}

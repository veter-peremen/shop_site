import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { deleteOrder, updateOrderStatus, updateOrderTracking } from "@/lib/orders";

const ADMIN_ROLES = new Set(["admin", "manager"]);

const patchSchema = z
  .object({
    status: z.string().trim().min(1).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.status !== undefined || data.trackingNumber !== undefined, {
    message: "status or trackingNumber is required",
  });

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

  if (parsed.data.status !== undefined) {
    const result = await updateOrderStatus(user.id, id, parsed.data.status);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "not-found" ? 404 : 400 });
    }
  }

  if (parsed.data.trackingNumber !== undefined) {
    const result = await updateOrderTracking(user.id, id, parsed.data.trackingNumber);
    if (!result.ok) {
      return NextResponse.json(result, { status: 404 });
    }
  }

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
  const result = await deleteOrder(user.id, id);

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

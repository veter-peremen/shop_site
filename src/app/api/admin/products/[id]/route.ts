import { NextResponse } from "next/server";

import { deleteProduct, updateProduct, updateProductSchema } from "@/lib/admin-products";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const WRITE_ROLES = new Set(["admin", "content"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !WRITE_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body", details: parsed.error.flatten() }, { status: 400 });
  }

  const product = await updateProduct(user.id, id, parsed.data);

  if (!product) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !WRITE_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteProduct(user.id, id);

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "not-found" ? 404 : 409 });
  }

  return NextResponse.json({ ok: true });
}

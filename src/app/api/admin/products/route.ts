import { NextResponse } from "next/server";

import { createProduct, createProductSchema, getAllProductsForAdmin } from "@/lib/admin-products";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const ADMIN_ROLES = new Set(["admin", "manager", "content", "support"]);
const WRITE_ROLES = new Set(["admin", "content"]);

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const products = await getAllProductsForAdmin();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !WRITE_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getAllProductsForAdmin();
  if (existing.some((product) => product.slug === parsed.data.slug)) {
    return NextResponse.json({ error: "slug-taken" }, { status: 409 });
  }

  const product = await createProduct(user.id, parsed.data);
  return NextResponse.json({ product });
}

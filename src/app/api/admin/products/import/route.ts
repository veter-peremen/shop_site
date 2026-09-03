import { NextResponse } from "next/server";

import { importProductsFromWorkbook } from "@/lib/admin-products";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const WRITE_ROLES = new Set(["admin", "content"]);
const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !WRITE_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  if (file.size > MAX_IMPORT_SIZE) {
    return NextResponse.json({ error: "file-too-large" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importProductsFromWorkbook(user.id, buffer);

  return NextResponse.json({ result });
}
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { addProductImage, removeProductImage } from "@/lib/admin-products";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const WRITE_ROLES = new Set(["admin", "content"]);
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "products");
const URL_PREFIX = "/api/uploads/products/";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user || !WRITE_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "unsupported-type" }, { status: 415 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "file-too-large" }, { status: 413 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${id}-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const product = await addProductImage(user.id, id, `${URL_PREFIX}${filename}`);

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
  const body = await request.json().catch(() => null);
  const imageUrl = body?.url;

  if (typeof imageUrl !== "string" || !imageUrl.startsWith(URL_PREFIX)) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const product = await removeProductImage(user.id, id, imageUrl);

  if (!product) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  await unlink(path.join(UPLOAD_DIR, path.basename(imageUrl))).catch(() => {});

  return NextResponse.json({ product });
}

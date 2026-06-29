import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { deleteReview, setReviewPublished } from "@/lib/reviews";

const ADMIN_ROLES = new Set(["admin", "manager", "content"]);

const patchSchema = z.object({ isPublished: z.boolean() });

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

  const result = await setReviewPublished(user.id, id, parsed.data.isPublished);

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteReview(user.id, id);

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}

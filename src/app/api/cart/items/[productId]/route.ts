import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { removeCartItem, resolveCartIdentity, setCartItemQuantity } from "@/lib/cart";
import { verifyCsrf } from "@/lib/csrf";

const patchSchema = z.object({
  quantity: z.coerce.number().int().max(99),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const { productId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const identity = await resolveCartIdentity(user?.id ?? null);
  const result = await setCartItemQuantity(identity, productId, parsed.data.quantity);
  return NextResponse.json(result);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const { productId } = await params;
  const user = await getCurrentUser();
  const identity = await resolveCartIdentity(user?.id ?? null);
  const result = await removeCartItem(identity, productId);
  return NextResponse.json(result);
}

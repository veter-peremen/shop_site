import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { removeWishlistItem, resolveWishlistIdentity } from "@/lib/wishlist";

export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const { productId } = await params;
  const user = await getCurrentUser();
  const identity = await resolveWishlistIdentity(user?.id ?? null);
  const productIds = await removeWishlistItem(identity, productId);
  return NextResponse.json({ productIds });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { addWishlistItem, resolveWishlistIdentity } from "@/lib/wishlist";

const addItemSchema = z.object({
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = addItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const identity = await resolveWishlistIdentity(user?.id ?? null);
  const productIds = await addWishlistItem(identity, parsed.data.productId);
  return NextResponse.json({ productIds });
}

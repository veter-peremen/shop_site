import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getWishlist, resolveWishlistIdentity } from "@/lib/wishlist";

export async function GET() {
  const user = await getCurrentUser();
  const identity = await resolveWishlistIdentity(user?.id ?? null);
  const productIds = await getWishlist(identity);
  return NextResponse.json({ productIds });
}

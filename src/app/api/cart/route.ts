import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getCart, resolveCartIdentity } from "@/lib/cart";

export async function GET() {
  const user = await getCurrentUser();
  const identity = await resolveCartIdentity(user?.id ?? null);
  const result = await getCart(identity);
  return NextResponse.json(result);
}

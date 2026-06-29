import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { clearCartItems, resolveCartIdentity } from "@/lib/cart";
import { verifyCsrf } from "@/lib/csrf";

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  const identity = await resolveCartIdentity(user?.id ?? null);
  await clearCartItems(identity);
  return NextResponse.json({ ok: true });
}

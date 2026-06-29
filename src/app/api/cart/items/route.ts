import { NextResponse } from "next/server";
import { z } from "zod";

import { addCartItem, resolveCartIdentity } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(99).default(1),
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
  const identity = await resolveCartIdentity(user?.id ?? null);
  const result = await addCartItem(identity, parsed.data.productId, parsed.data.quantity);
  return NextResponse.json(result);
}

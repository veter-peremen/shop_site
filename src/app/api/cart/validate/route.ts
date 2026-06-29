import { NextResponse } from "next/server";

import { validateCartLines, type CartLineInput } from "@/lib/cart";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? (body.items as CartLineInput[]) : null;

  if (!items) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const sanitized = items
    .filter((item) => typeof item.productId === "string" && Number.isFinite(item.quantity))
    .map((item) => ({ productId: item.productId, quantity: Math.max(0, Math.floor(item.quantity)) }));

  const result = await validateCartLines(sanitized);
  return NextResponse.json(result);
}

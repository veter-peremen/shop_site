import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { cancelOrderByCustomer } from "@/lib/orders";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await cancelOrderByCustomer(user.id, id);

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "not-found" ? 404 : 400 });
  }

  return NextResponse.json(result);
}

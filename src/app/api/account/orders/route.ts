import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOrdersByUser } from "@/lib/orders";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orders = await getOrdersByUser(user.id);
  return NextResponse.json({ orders });
}

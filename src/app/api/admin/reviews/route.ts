import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getAllReviews } from "@/lib/reviews";

const ADMIN_ROLES = new Set(["admin", "manager", "content", "support"]);

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const reviews = await getAllReviews();
  return NextResponse.json({ reviews });
}

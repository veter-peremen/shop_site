import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getAllUsers } from "@/lib/users";

const ADMIN_ROLES = new Set(["admin", "manager", "support"]);

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}

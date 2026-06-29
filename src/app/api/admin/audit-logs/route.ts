import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRecentAuditLogs } from "@/lib/audit";

const ADMIN_ROLES = new Set(["admin", "manager"]);

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const logs = await getRecentAuditLogs();
  return NextResponse.json({ logs });
}

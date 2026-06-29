import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSalesReport } from "@/lib/reports";

const ADMIN_ROLES = new Set(["admin", "manager"]);

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const defaults = defaultRange();
  const from = url.searchParams.get("from") || defaults.from;
  const to = url.searchParams.get("to") || defaults.to;

  const report = await getSalesReport(from, to);
  return NextResponse.json({ report });
}

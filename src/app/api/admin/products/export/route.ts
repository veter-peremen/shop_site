import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { exportProductsWorkbook } from "@/lib/admin-products";

const ADMIN_ROLES = new Set(["admin", "manager", "content"]);

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const buffer = await exportProductsWorkbook();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sonkei-products-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

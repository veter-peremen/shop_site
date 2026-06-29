import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getBonusAccount, getBonusTransactionsByUser } from "@/lib/bonus";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [account, transactions] = await Promise.all([
    getBonusAccount(user.id),
    getBonusTransactionsByUser(user.id),
  ]);

  return NextResponse.json({ account, transactions });
}

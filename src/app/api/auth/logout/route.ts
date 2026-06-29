import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { destroySession, SESSION_COOKIE } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await destroySession(token);
    cookieStore.delete(SESSION_COOKIE);
  }

  return NextResponse.json({ ok: true });
}

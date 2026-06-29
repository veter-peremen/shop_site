import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";

export async function verifyCsrf(request: Request): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json({ error: "csrf-failed" }, { status: 403 });
  }

  return null;
}

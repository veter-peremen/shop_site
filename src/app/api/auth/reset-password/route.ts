import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { CART_SESSION_COOKIE } from "@/lib/cart-constants";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { verifyCsrf } from "@/lib/csrf";
import { resetPassword } from "@/lib/password-reset";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { mergeGuestWishlistIntoUser } from "@/lib/wishlist";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(255),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`pwreset-confirm:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  const result = await resetPassword(parsed.data.token, parsed.data.password);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const sessionToken = await createSession(result.userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const guestCartSessionId = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;
  await mergeGuestCartIntoUser(result.userId, guestCartSessionId);
  await mergeGuestWishlistIntoUser(result.userId, guestCartSessionId);

  return NextResponse.json({ ok: true });
}

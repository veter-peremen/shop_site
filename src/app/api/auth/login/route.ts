import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { createSession, SESSION_COOKIE, verifyCredentials } from "@/lib/auth";
import { CART_SESSION_COOKIE } from "@/lib/cart-constants";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { verifyCsrf } from "@/lib/csrf";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { mergeGuestWishlistIntoUser } from "@/lib/wishlist";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(255),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);
  const emailLimit = rateLimit(`login:email:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterMs);

  const user = await verifyCredentials(email, password);

  if (!user) {
    return NextResponse.json({ error: "invalid-credentials" }, { status: 401 });
  }

  const token = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const guestCartSessionId = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;
  await mergeGuestCartIntoUser(user.id, guestCartSessionId);
  await mergeGuestWishlistIntoUser(user.id, guestCartSessionId);

  return NextResponse.json({ user });
}

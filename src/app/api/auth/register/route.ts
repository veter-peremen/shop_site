import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { createSession, registerUser, SESSION_COOKIE } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { CART_SESSION_COOKIE } from "@/lib/cart-constants";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { verifyCsrf } from "@/lib/csrf";
import { createEmailVerificationToken } from "@/lib/email-verification";
import { isLocale } from "@/i18n/routing";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { mergeGuestWishlistIntoUser } from "@/lib/wishlist";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(255),
  name: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
  locale: z.string().optional(),
  captchaToken: z.string().min(1),
  captchaAnswer: z.coerce.number(),
});

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const { email, password, name, phone, captchaToken, captchaAnswer } = parsed.data;

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`register:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return NextResponse.json({ error: "invalid-captcha" }, { status: 400 });
  }

  const result = await registerUser({ email, password, name, phone });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const locale = isLocale(parsed.data.locale ?? "") ? parsed.data.locale! : "ru";
  await createEmailVerificationToken(result.user.id, locale);

  const token = await createSession(result.user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const guestCartSessionId = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;
  await mergeGuestCartIntoUser(result.user.id, guestCartSessionId);
  await mergeGuestWishlistIntoUser(result.user.id, guestCartSessionId);

  return NextResponse.json({ user: result.user });
}

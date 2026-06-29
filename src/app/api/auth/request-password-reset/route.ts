import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyCsrf } from "@/lib/csrf";
import { isLocale } from "@/i18n/routing";
import { requestPasswordReset } from "@/lib/password-reset";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(255),
  locale: z.string().optional(),
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
  const ipLimit = rateLimit(`pwreset:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);
  const emailLimit = rateLimit(`pwreset:email:${parsed.data.email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterMs);

  const locale = isLocale(parsed.data.locale ?? "") ? parsed.data.locale! : "ru";
  await requestPasswordReset(parsed.data.email, locale);

  return NextResponse.json({ ok: true });
}

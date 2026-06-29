import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { createEmailVerificationToken } from "@/lib/email-verification";
import { isLocale } from "@/i18n/routing";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({ locale: z.string().optional() });

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  const rawLocale = parsed.success ? parsed.data.locale ?? "" : "";
  const locale = isLocale(rawLocale) ? rawLocale : "ru";

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`resend-verify:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);
  const userLimit = rateLimit(`resend-verify:user:${user.id}`, 3, 60 * 60 * 1000);
  if (!userLimit.allowed) return rateLimitResponse(userLimit.retryAfterMs);

  await createEmailVerificationToken(user.id, locale);

  return NextResponse.json({ ok: true });
}

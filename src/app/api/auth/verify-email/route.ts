import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyCsrf } from "@/lib/csrf";
import { verifyEmailToken } from "@/lib/email-verification";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const ipLimit = rateLimit(`verify-email:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.retryAfterMs);

  const result = await verifyEmailToken(parsed.data.token);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

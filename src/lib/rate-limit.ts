import { NextResponse } from "next/server";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

let sweepCounter = 0;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.every((ts) => now - ts > 60 * 60 * 1000)) {
      buckets.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();

  sweepCounter += 1;
  if (sweepCounter >= 200) {
    sweepCounter = 0;
    sweep(now);
  }

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - bucket.timestamps[0]);
    return { allowed: false, retryAfterMs };
  }

  bucket.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export function rateLimitResponse(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: "rate-limited" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
  );
}

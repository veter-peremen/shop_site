import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const SECRET = process.env.CAPTCHA_SECRET || randomBytes(32).toString("hex");
const CAPTCHA_TTL_MS = 5 * 60 * 1000;

const usedTokens = new Map<string, number>();

function sweepUsedTokens(now: number) {
  for (const [token, expiresAt] of usedTokens) {
    if (now > expiresAt) usedTokens.delete(token);
  }
}

export type CaptchaChallenge = { question: string; token: string };

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function generateCaptcha(): CaptchaChallenge {
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  const answer = a + b;
  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  const payload = `${answer}.${expiresAt}`;
  const signature = sign(payload);
  const token = Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");

  return { question: `${a} + ${b}`, token };
}

export function verifyCaptcha(token: string, answer: number): boolean {
  try {
    const now = Date.now();
    sweepUsedTokens(now);

    if (usedTokens.has(token)) return false;

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    const secondLastDot = decoded.lastIndexOf(".", lastDot - 1);
    if (lastDot === -1 || secondLastDot === -1) return false;

    const payload = decoded.slice(0, lastDot);
    const signature = decoded.slice(lastDot + 1);
    const expectedSignature = sign(payload);

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (signatureBuffer.length !== expectedBuffer.length) return false;
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

    const expectedAnswer = Number(decoded.slice(0, secondLastDot));
    const expiresAt = Number(decoded.slice(secondLastDot + 1, lastDot));

    if (!Number.isFinite(expiresAt) || now > expiresAt) return false;
    if (expectedAnswer !== answer) return false;

    usedTokens.set(token, expiresAt);
    return true;
  } catch {
    return false;
  }
}

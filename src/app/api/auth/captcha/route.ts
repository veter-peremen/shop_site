import { NextResponse } from "next/server";

import { generateCaptcha } from "@/lib/captcha";

export async function GET() {
  const challenge = generateCaptcha();
  return NextResponse.json(challenge);
}

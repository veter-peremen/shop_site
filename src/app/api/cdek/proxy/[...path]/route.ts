import { type NextRequest, NextResponse } from "next/server";

import { getCdekToken } from "@/lib/cdek";

export const dynamic = "force-dynamic";

const CDEK_API = process.env.CDEK_API_URL ?? "https://api.cdek.ru/v2";

// Restrict to read-only endpoints the widget legitimately needs
const ALLOWED_GET_PREFIXES = [
  "location/",
  "deliverypoints",
  "calculator/tarifflist",
  "calculator/tariff",
];
const ALLOWED_POST_PATHS = ["calculator/tariff", "calculator/tarifflist"];

function isAllowed(method: string, cdekPath: string): boolean {
  if (method === "GET") {
    return ALLOWED_GET_PREFIXES.some(
      (prefix) => cdekPath === prefix || cdekPath.startsWith(prefix),
    );
  }
  if (method === "POST") {
    return ALLOWED_POST_PATHS.some(
      (allowed) => cdekPath === allowed || cdekPath.startsWith(allowed + "/"),
    );
  }
  return false;
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const cdekPath = pathSegments.join("/");

  if (!isAllowed(req.method, cdekPath)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let token: string;
  try {
    token = await getCdekToken();
  } catch {
    return NextResponse.json({ error: "CDEK auth failed" }, { status: 502 });
  }

  const targetUrl = new URL(`${CDEK_API}/${cdekPath}`);
  req.nextUrl.searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

  const isBodyMethod = req.method !== "GET" && req.method !== "HEAD";
  const body = isBodyMethod ? await req.text() : undefined;

  const res = await fetch(targetUrl.toString(), {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": req.headers.get("Content-Type") ?? "application/json",
    },
    body,
    cache: "no-store",
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}
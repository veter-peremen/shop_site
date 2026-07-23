import { type NextRequest, NextResponse } from "next/server";

import { getCdekToken } from "@/lib/cdek";

export const dynamic = "force-dynamic";

const CDEK_API = process.env.CDEK_API_URL ?? "https://api.cdek.ru/v2";

async function proxy(req: NextRequest, pathSegments: string[]) {
  let token: string;
  try {
    token = await getCdekToken();
  } catch {
    return NextResponse.json({ error: "CDEK auth failed" }, { status: 502 });
  }

  const cdekPath = pathSegments.join("/");
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
      "Access-Control-Allow-Origin": "*",
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
import { type NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CdekWebhookPayload {
  type: string;
  date_time: string;
  uuid: string;
  attributes: {
    cdek_number?: string;
    status_code?: string;
    status_date_time?: string;
    city_name?: string;
  };
}

export async function POST(req: NextRequest) {
  // Verify shared secret (set CDEK_WEBHOOK_SECRET in env and register webhook URL with ?secret=<value>)
  const WEBHOOK_SECRET = process.env.CDEK_WEBHOOK_SECRET;
  if (WEBHOOK_SECRET) {
    const provided =
      req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-webhook-secret");
    if (!provided || provided !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  let payload: CdekWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cdekUuid = payload.uuid;
  if (!cdekUuid) {
    return NextResponse.json({ ok: true });
  }

  const cdekStatus = payload.attributes?.status_code ?? payload.type ?? null;
  const cdekWaybill = payload.attributes?.cdek_number ?? null;

  await query(
    `update orders set
       cdek_status  = coalesce($1, cdek_status),
       cdek_waybill = coalesce($2, cdek_waybill),
       updated_at   = now()
     where cdek_uuid = $3`,
    [cdekStatus, cdekWaybill, cdekUuid],
  );

  return NextResponse.json({ ok: true });
}
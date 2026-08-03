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

import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createCdekOrder } from "@/lib/cdek";
import { verifyCsrf } from "@/lib/csrf";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["admin", "manager"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const csrfError = await verifyCsrf(req);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;

  const order = await queryOne<{
    id: string;
    number: string;
    customer_name: string;
    customer_phone: string | null;
    city: string | null;
    delivery_method: string | null;
    delivery_address: string | null;
    delivery_pickup_point: string | null;
    cdek_uuid: string | null;
  }>(
    `select id, number, customer_name, customer_phone, city, delivery_method,
            delivery_address, delivery_pickup_point, cdek_uuid
     from orders where id = $1`,
    [orderId],
  );

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.cdek_uuid) {
    return NextResponse.json({ error: "CDEK order already exists", cdekUuid: order.cdek_uuid }, { status: 409 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const tariffCode = (body.tariffCode as number) ?? 139;
  const fromCityCode = Number(process.env.CDEK_SENDER_CITY_CODE ?? 44);
  const weight = (body.weight as number) ?? 500;

  try {
    const result = await createCdekOrder({
      orderNumber: order.number,
      tariffCode,
      fromCityCode,
      toCity: order.city ?? "",
      deliveryPoint: order.delivery_pickup_point ?? undefined,
      toAddress: order.delivery_address ?? undefined,
      recipientName: order.customer_name,
      recipientPhone: order.customer_phone ?? "",
      weight,
    });

    const cdekUuid = result.entity?.uuid;
    const errors = result.requests?.[0]?.errors;

    if (errors?.length) {
      return NextResponse.json({ error: errors[0].message }, { status: 422 });
    }

    if (!cdekUuid) {
      return NextResponse.json({ error: "No UUID returned from CDEK" }, { status: 502 });
    }

    await query(
      `update orders set cdek_uuid = $1, updated_at = now() where id = $2`,
      [cdekUuid, orderId],
    );

    return NextResponse.json({ ok: true, cdekUuid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
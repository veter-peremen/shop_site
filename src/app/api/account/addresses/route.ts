import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createAddress, getAddressesByUser } from "@/lib/addresses";
import { verifyCsrf } from "@/lib/csrf";

const createSchema = z.object({
  city: z.string().trim().max(255).optional(),
  address: z.string().trim().max(500).optional(),
  pickupPointCode: z.string().trim().max(100).optional(),
  comment: z.string().trim().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const addresses = await getAddressesByUser(user.id);
  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const address = await createAddress(user.id, parsed.data);
  return NextResponse.json({ address });
}

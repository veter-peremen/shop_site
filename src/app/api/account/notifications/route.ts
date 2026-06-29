import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/users";

const patchSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  telegramNotificationsEnabled: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const preferences = await getNotificationPreferences(user.id);
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
  const csrfError = await verifyCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const preferences = await updateNotificationPreferences(user.id, parsed.data);
  return NextResponse.json({ preferences });
}

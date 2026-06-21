import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<SiteSettings>;
  await saveSettings(body);
  return NextResponse.json({ success: true, settings: await getSettings() });
}

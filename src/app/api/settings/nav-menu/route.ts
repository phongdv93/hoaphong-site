import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform/access";
import { getNavMenu, normalizeNavMenu, saveNavMenu } from "@/lib/nav-menu";

export async function GET() {
  const items = await getNavMenu();
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPlatformAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { items?: unknown };
  const items = normalizeNavMenu(body.items);
  const saved = await saveNavMenu(items);
  return NextResponse.json({ success: true, items: saved });
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listFactoryParts } from "@/lib/factory/products";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q") || undefined;
  return NextResponse.json(await listFactoryParts(q));
}

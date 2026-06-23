import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { listFactoryParts } from "@/lib/factory/products";

export async function GET(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;
  const q = new URL(request.url).searchParams.get("q") || undefined;
  return ctx.run(async () => NextResponse.json(await listFactoryParts(q)));
}

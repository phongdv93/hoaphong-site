import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { createFactoryProduct, listFactoryProducts } from "@/lib/factory/products";
import type { FactoryProductPayload } from "@/lib/factory/types";

export async function GET() {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;
  return ctx.run(async () => NextResponse.json(await listFactoryProducts()));
}

export async function POST(request: Request) {
  const ctx = await requireActiveTenant();
  if (ctx.error) return ctx.error;

  return ctx.run(async () => {
  let body: FactoryProductPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const id = await createFactoryProduct(body);
    return NextResponse.json({ id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi lưu";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  });
}

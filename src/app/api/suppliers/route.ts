import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { createSupplier, listSuppliers } from "@/lib/suppliers/repository";

export async function GET(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  return ctx.run(async () => NextResponse.json({ items: await listSuppliers(ctx.companyId, q) }));
}

export async function POST(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  return ctx.run(async () => {
    try {
      const supplier = await createSupplier(ctx.companyId, body.name ?? "");
      return NextResponse.json({ supplier });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Không tạo được NCC" },
        { status: 400 }
      );
    }
  });
}

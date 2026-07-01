import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { searchFactoryProducts } from "@/lib/factory/products";

export async function GET(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? 30)));
  const supplierIdRaw = new URL(req.url).searchParams.get("supplierId");
  const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;

  return ctx.run(async () => {
    const items = await searchFactoryProducts(
      q,
      limit,
      Number.isFinite(supplierId) ? supplierId : null
    );
    return NextResponse.json({ items });
  });
}

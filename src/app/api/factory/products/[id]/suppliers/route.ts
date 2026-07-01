import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  listProductSupplierOffers,
  saveProductSupplierOffers,
} from "@/lib/suppliers/repository";
import type { ProductSupplierOfferInput } from "@/lib/suppliers/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const productId = Number((await params).id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }
  return ctx.run(async () =>
    NextResponse.json({ offers: await listProductSupplierOffers(ctx.companyId, productId) })
  );
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const productId = Number((await params).id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }
  const body = (await req.json()) as { offers?: ProductSupplierOfferInput[] };
  return ctx.run(async () => {
    try {
      const offers = await saveProductSupplierOffers(
        ctx.companyId,
        productId,
        body.offers ?? []
      );
      return NextResponse.json({ offers });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Lưu thất bại" },
        { status: 400 }
      );
    }
  });
}

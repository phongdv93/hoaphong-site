import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  addPurchaseOrderLines,
  createPurchaseOrder,
  listPurchaseOrders,
} from "@/lib/purchase-orders/repository";
import type { PurchaseOrderInput } from "@/lib/purchase-orders/types";

export async function GET() {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    const items = await listPurchaseOrders(ctx.companyId, null);
    return NextResponse.json({ items });
  });
}

export async function POST(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json()) as PurchaseOrderInput & {
    lines?: Array<{ source: "catalog"; factoryProductId: number; quantity?: number }>;
  };

  return ctx.run(async () => {
    try {
      let po = await createPurchaseOrder(ctx.companyId, null, body, ctx.user.id);
      if (body.lines?.length) {
        po = await addPurchaseOrderLines(ctx.companyId, null, po.id, body.lines);
      }
      return NextResponse.json({ order: po });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Tạo đơn thất bại" },
        { status: 400 }
      );
    }
  });
}

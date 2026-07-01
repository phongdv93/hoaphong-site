import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  addPurchaseOrderLines,
  deletePurchaseOrder,
  getPurchaseOrder,
  removePurchaseOrderLine,
  updatePurchaseOrder,
} from "@/lib/purchase-orders/repository";
import type { PurchaseOrderInput } from "@/lib/purchase-orders/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ poId: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const orderId = Number((await params).poId);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    const order = await getPurchaseOrder(ctx.companyId, null, orderId);
    if (!order) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return NextResponse.json({ order });
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ poId: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const orderId = Number((await params).poId);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  const body = (await req.json()) as Partial<PurchaseOrderInput> & {
    addLines?: Array<{ source: "catalog"; factoryProductId: number; quantity?: number }>;
    removeLineIds?: number[];
  };

  return ctx.run(async () => {
    try {
      if (body.supplierName !== undefined || body.status !== undefined || body.orderedAt !== undefined || body.expectedAt !== undefined || body.notes !== undefined) {
        await updatePurchaseOrder(ctx.companyId, null, orderId, body);
      }
      if (body.removeLineIds?.length) {
        for (const lineId of body.removeLineIds) {
          await removePurchaseOrderLine(ctx.companyId, null, orderId, lineId);
        }
      }
      if (body.addLines?.length) {
        await addPurchaseOrderLines(ctx.companyId, null, orderId, body.addLines);
      }
      const order = await getPurchaseOrder(ctx.companyId, null, orderId);
      return NextResponse.json({ order });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Cập nhật thất bại" },
        { status: 400 }
      );
    }
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ poId: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const orderId = Number((await params).poId);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    await deletePurchaseOrder(ctx.companyId, null, orderId);
    return NextResponse.json({ ok: true });
  });
}

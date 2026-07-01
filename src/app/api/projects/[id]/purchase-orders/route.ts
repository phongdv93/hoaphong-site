import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import {
  addPurchaseOrderLines,
  createPurchaseOrder,
  listPurchaseOrders,
} from "@/lib/purchase-orders/repository";
import type { PurchaseOrderInput } from "@/lib/purchase-orders/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "ID dự án không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    const items = await listPurchaseOrders(ctx.companyId, projectId);
    return NextResponse.json({ items });
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "ID dự án không hợp lệ" }, { status: 400 });
  }

  const body = (await req.json()) as PurchaseOrderInput & {
    lines?: Array<
      | { source: "item"; projectItemId: number }
      | { source: "catalog"; factoryProductId: number; quantity?: number }
    >;
  };

  return ctx.run(async () => {
    try {
      let po = await createPurchaseOrder(
        ctx.companyId,
        projectId,
        body,
        ctx.user.id
      );
      if (body.lines?.length) {
        po = await addPurchaseOrderLines(ctx.companyId, projectId, po.id, body.lines);
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

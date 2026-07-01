import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { suggestProjectPurchaseOrders } from "@/lib/purchase-orders/suggest";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const projectId = Number((await params).id);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: "ID dự án không hợp lệ" }, { status: 400 });
  }

  return ctx.run(async () => {
    try {
      const result = await suggestProjectPurchaseOrders(ctx.companyId, projectId, ctx.user.id);
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Đề xuất thất bại" },
        { status: 400 }
      );
    }
  });
}

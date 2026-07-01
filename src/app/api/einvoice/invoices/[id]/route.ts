import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { EINVOICE_MODULE_ID } from "@/lib/einvoice/constants";
import { getEInvoice, refreshEInvoiceFromMobifone } from "@/lib/einvoice/repository";
import { hasModuleAccess } from "@/lib/platform/access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, EINVOICE_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }

    const { id } = await params;
    const num = Number(id);
    if (!Number.isFinite(num)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    const refresh = new URL(req.url).searchParams.get("refresh") === "1";
    try {
      const invoice = refresh
        ? await refreshEInvoiceFromMobifone(ctx.companyId, num)
        : await getEInvoice(ctx.companyId, num);
      if (!invoice) {
        return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
      }
      return NextResponse.json({ invoice });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Không tải được hóa đơn" },
        { status: 400 }
      );
    }
  });
}

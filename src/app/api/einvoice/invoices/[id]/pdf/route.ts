import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { EINVOICE_MODULE_ID } from "@/lib/einvoice/constants";
import { downloadEInvoicePdf } from "@/lib/einvoice/repository";
import { hasModuleAccess } from "@/lib/platform/access";

export async function GET(
  _req: Request,
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

    try {
      const file = await downloadEInvoicePdf(ctx.companyId, num);
      return new NextResponse(file.data, {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `inline; filename="${file.filename}"`,
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Không tải được PDF" },
        { status: 400 }
      );
    }
  });
}

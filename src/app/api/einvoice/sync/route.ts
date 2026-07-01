import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { EINVOICE_MODULE_ID } from "@/lib/einvoice/constants";
import { syncMobifoneOutInvoices } from "@/lib/einvoice/repository";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageEinvoice } from "@/lib/projects/permissions";

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export async function POST(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, EINVOICE_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageEinvoice(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      fromDate?: string;
      toDate?: string;
    };
    const defaults = defaultDateRange();
    const fromDate = (body.fromDate ?? defaults.from).slice(0, 10);
    const toDate = (body.toDate ?? defaults.to).slice(0, 10);

    try {
      const result = await syncMobifoneOutInvoices(ctx.companyId, fromDate, toDate);
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Đồng bộ thất bại" },
        { status: 400 }
      );
    }
  });
}

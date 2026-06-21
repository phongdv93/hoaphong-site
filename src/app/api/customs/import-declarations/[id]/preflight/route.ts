import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { getDeclarationPreflightReport } from "@/lib/customs/repository";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";

function parseId(params: { id: string }): number | null {
  const id = Number(params.id);
  return Number.isFinite(id) ? id : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;
  const { id: idStr } = await params;
  const id = parseId({ id: idStr });
  if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    try {
      const report = await getDeclarationPreflightReport(id, ctx.companyId);
      return NextResponse.json(report);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Không kiểm tra được tờ khai" },
        { status: 400 }
      );
    }
  });
}

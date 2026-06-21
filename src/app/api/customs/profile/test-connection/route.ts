import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { testVnaccsProfileConnection } from "@/lib/customs/repository";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import type { VnaccsProfileInput } from "@/lib/customs/types";

export async function POST(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<VnaccsProfileInput>;
    const result = await testVnaccsProfileConnection(ctx.companyId, body);
    return NextResponse.json(result);
  });
}

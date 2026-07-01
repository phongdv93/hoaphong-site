import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { EINVOICE_MODULE_ID } from "@/lib/einvoice/constants";
import { testMobifoneProfileConnection } from "@/lib/einvoice/repository";
import type { MobifoneProfileInput } from "@/lib/einvoice/types";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageEinvoice } from "@/lib/projects/permissions";

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
    const body = (await req.json().catch(() => ({}))) as Partial<MobifoneProfileInput>;
    const result = await testMobifoneProfileConnection(ctx.companyId, body);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  });
}

import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import {
  checkSigningAgentHealth,
  listSigningCertificates,
} from "@/lib/customs/signing-agent";

export async function GET() {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    try {
      const [health, items] = await Promise.all([
        checkSigningAgentHealth(),
        listSigningCertificates(),
      ]);
      return NextResponse.json({ health, items });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Không quét được chứng thư" },
        { status: 400 }
      );
    }
  });
}

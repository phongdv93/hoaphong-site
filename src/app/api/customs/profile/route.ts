import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { getVnaccsProfile, upsertVnaccsProfile } from "@/lib/customs/repository";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageCustoms } from "@/lib/projects/permissions";
import { getCompany } from "@/lib/projects/companies";
import type { VnaccsProfileInput } from "@/lib/customs/types";
import { CUSTOMS_MODULE_ID } from "@/lib/customs/constants";
import { isVnaccsProfileConfigured } from "@/lib/customs/profile";

export async function GET() {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    const profile = await getVnaccsProfile(ctx.companyId);
    const company = await getCompany(ctx.companyId);
    const configured = isVnaccsProfileConfigured(profile);

    return NextResponse.json({
      profile,
      configured,
      companyDefaults: company
        ? { taxCode: company.taxCode, companyName: company.name }
        : null,
    });
  });
}

export async function PUT(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, CUSTOMS_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageCustoms(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const body = (await req.json()) as VnaccsProfileInput;
    if (!body.taxCode?.trim() || !body.userCode?.trim() || !body.terminalId?.trim()) {
      return NextResponse.json({ error: "Thiếu MST, User Code hoặc Terminal ID" }, { status: 400 });
    }
    try {
      const profile = await upsertVnaccsProfile(ctx.companyId, body);
      return NextResponse.json({
        profile,
        configured: true,
        message: "Đã lưu vào database — công ty này dùng mãi, không cần nhập lại.",
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Lưu thất bại" },
        { status: 400 }
      );
    }
  });
}

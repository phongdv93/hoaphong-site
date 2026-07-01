import { NextResponse } from "next/server";
import { requireActiveTenant } from "@/lib/api/with-tenant";
import { EINVOICE_MODULE_ID } from "@/lib/einvoice/constants";
import { isMobifoneProfileConfigured } from "@/lib/einvoice/profile";
import {
  getCompanyEinvoiceContext,
  getMobifoneProfile,
  upsertMobifoneProfile,
} from "@/lib/einvoice/repository";
import type { MobifoneProfileInput } from "@/lib/einvoice/types";
import { hasModuleAccess } from "@/lib/platform/access";
import { canManageEinvoice } from "@/lib/projects/permissions";

export async function GET() {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, EINVOICE_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    const [profile, company] = await Promise.all([
      getMobifoneProfile(ctx.companyId),
      getCompanyEinvoiceContext(ctx.companyId),
    ]);
    return NextResponse.json({
      profile,
      configured: isMobifoneProfileConfigured(profile),
      company,
    });
  });
}

export async function PUT(req: Request) {
  const ctx = await requireActiveTenant();
  if ("error" in ctx) return ctx.error;

  return ctx.run(async () => {
    if (!(await hasModuleAccess(ctx.companyId, EINVOICE_MODULE_ID))) {
      return NextResponse.json({ error: "Module chưa được bật" }, { status: 403 });
    }
    if (!(await canManageEinvoice(ctx.companyId, ctx.user.id))) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    const body = (await req.json()) as MobifoneProfileInput;
    if (!body.apiUsername?.trim()) {
      return NextResponse.json({ error: "Nhập tài khoản MobiFone" }, { status: 400 });
    }
    try {
      const profile = await upsertMobifoneProfile(ctx.companyId, body);
      return NextResponse.json({
        profile,
        configured: isMobifoneProfileConfigured(profile),
        message: "Đã lưu cấu hình MobiFone — MST lấy từ hồ sơ công ty.",
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Lưu thất bại" },
        { status: 400 }
      );
    }
  });
}

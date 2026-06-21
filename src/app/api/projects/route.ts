import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasModuleAccess, isPlatformAdmin } from "@/lib/platform/access";
import { hasUserModuleAccess } from "@/lib/platform/member-modules";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { canCreateProject } from "@/lib/projects/permissions";
import { createProject, listProjects } from "@/lib/projects/repository";
import type { ProjectStatus } from "@/lib/projects/types";

async function requireActiveCompany(userId: number) {
  const active = await resolveActiveCompanyForUser(userId);
  if (!active) {
    return { error: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };
  }
  // Module du-an phải được Hoa Phong bật cho công ty này (super admin bypass)
  const admin = await isPlatformAdmin(userId);
  if (!admin && !(await hasModuleAccess(active.companyId, "du-an"))) {
    return {
      error: NextResponse.json(
        { error: "Công ty chưa được mở module Quản lý dự án" },
        { status: 403 }
      ),
    };
  }
  if (
    !admin &&
    !(await hasUserModuleAccess(active.companyId, userId, "du-an", active.role))
  ) {
    return {
      error: NextResponse.json(
        { error: "Bạn chưa được cấp quyền module Quản lý dự án" },
        { status: 403 }
      ),
    };
  }
  return { active, admin };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { active, admin, error } = await requireActiveCompany(user.id);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || undefined) as ProjectStatus | undefined;
  const q = searchParams.get("q") || undefined;
  const restrictToMembership =
    !admin && active.role !== "admin" && active.role !== "manager";
  return runWithTenantCompany(active.companyId, async () => {
    const rows = await listProjects(active.companyId, {
      status,
      q,
      memberUserId: restrictToMembership ? user.id : undefined,
    });
    return NextResponse.json(rows);
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { active, error } = await requireActiveCompany(user.id);
  if (error) return error;

  if (!(await canCreateProject(active.companyId, user.id))) {
    return NextResponse.json(
      { error: "Chỉ admin/quản lý công ty được tạo dự án" },
      { status: 403 }
    );
  }

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Tên dự án bắt buộc" }, { status: 400 });
  }
  if (!body.code?.trim()) {
    return NextResponse.json(
      { error: "Mã dự án (PI / số hợp đồng) bắt buộc" },
      { status: 400 }
    );
  }

  try {
    const id = await runWithTenantCompany(active.companyId, () =>
      createProject({
      companyId: active.companyId,
      code: body.code,
      name: body.name.trim(),
      customerId: body.customerId ?? null,
      contractValue: Number(body.contractValue ?? 0),
      contractSignedAt: body.contractSignedAt || null,
      status: body.status || "open",
      startDate: body.startDate || null,
      expectedEndDate: body.expectedEndDate || null,
      address: body.address || "",
      notes: body.notes || "",
      supplierAddress: body.supplierAddress || "",
      exportCountry: body.exportCountry || "",
      managerUserId: body.managerUserId ?? null,
      createdBy: user.id,
      seedPhases: body.seedPhases !== false,
    })
    );
    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi tạo dự án";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

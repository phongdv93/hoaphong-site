import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { requireModuleAccess } from "@/lib/platform/guard";
import { getActiveModuleIds } from "@/lib/platform/access";
import { PLATFORM_MODULES } from "@/lib/platform/catalog";
import { listMemberModuleIds } from "@/lib/platform/member-modules";
import { listCompanyMembers, resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { COMPANY_ROLE_LABELS } from "@/lib/projects/constants";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await requireModuleAccess("quan-tri");
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason === "no_module" ? `Chưa mở module ${gate.moduleName}` : "Không có quyền" },
      { status: gate.reason === "unauthorized" ? 401 : 403 }
    );
  }

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 });
  }

  const ultimate = await isUltimateAdmin(user.id);
  const role = await getEffectiveCompanyRole(active.companyId, user.id);
  const canViewAll = ultimate || role === "admin" || role === "manager";

  const members = await listCompanyMembers(active.companyId);
  const activeMembers = members.filter((m) => m.status === "active");
  const activeModuleIdSet = await getActiveModuleIds(active.companyId);
  const activeModules = PLATFORM_MODULES.filter((m) => activeModuleIdSet.has(m.id)).map((m) => ({
    id: m.id,
    name: m.name,
  }));

  const rows = [];
  for (const m of activeMembers) {
    if (!canViewAll && m.userId !== user.id) continue;
    m.moduleIds = await listMemberModuleIds(active.companyId, m.userId);
    rows.push({
      userId: m.userId,
      name: m.userName,
      email: m.userEmail,
      role: m.role,
      roleLabel: COMPANY_ROLE_LABELS[m.role],
      departmentId: m.departmentId,
      moduleIds: m.moduleIds,
      accessSummary:
        m.role === "admin" || m.role === "manager"
          ? "Tất cả module công ty đã bật"
          : m.moduleIds.length > 0
          ? m.moduleIds.map((id) => activeModules.find((x) => x.id === id)?.name ?? id).join(", ")
          : "Chưa gán module",
    });
  }

  return NextResponse.json({
    companyId: active.companyId,
    myRole: role,
    canManage: ultimate || role === "admin",
    canViewAll,
    activeModules,
    members: rows,
    rules: [
      { role: "admin", access: "Toàn quyền công ty + quản lý nhân sự, module, website" },
      { role: "manager", access: "Mọi module ERP đã bật cho công ty" },
      { role: "member", access: "Chỉ các module được admin gán (HR → Sửa quyền)" },
    ],
  });
}

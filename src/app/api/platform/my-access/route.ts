import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";
import { getActiveModuleIds, isPlatformAdmin } from "@/lib/platform/access";
import { listMemberModuleIds } from "@/lib/platform/member-modules";

/**
 * Trả về thông tin truy cập của user hiện tại cho UI ERP:
 *   - isPlatformAdmin: có phải super admin Hoa Phong?
 *   - activeCompanyId: công ty đang chọn
 *   - enabledModuleIds: các module công ty đã được Hoa Phong bật
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [admin, active] = await Promise.all([
    isPlatformAdmin(user.id),
    resolveActiveCompanyForUser(user.id),
  ]);

  let enabledModuleIds: string[] = [];
  let myRole: string | null = null;
  if (active) {
    myRole = active.role;
    const companyModules = await getActiveModuleIds(active.companyId);
    if (admin || active.role === "admin" || active.role === "manager") {
      enabledModuleIds = Array.from(companyModules);
    } else {
      const grants = await listMemberModuleIds(active.companyId, user.id);
      enabledModuleIds = grants.filter((id) => companyModules.has(id));
    }
  }

  return NextResponse.json({
    isPlatformAdmin: admin,
    activeCompanyId: active?.companyId ?? null,
    myRole,
    enabledModuleIds,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

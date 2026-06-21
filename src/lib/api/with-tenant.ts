import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "@/lib/projects/companies";

export async function requireActiveTenant() {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return {
      error: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }),
    };
  }
  return {
    user,
    companyId: active.companyId,
    role: active.role,
    run: <T>(fn: () => Promise<T>) => runWithTenantCompany(active.companyId, fn),
  };
}

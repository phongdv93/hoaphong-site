import { getSessionUser } from "@/lib/auth";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { resolveActiveCompanyForUser } from "./companies";

export async function requireActiveTenantCompany(): Promise<
  | { userId: number; companyId: number; run: <T>(fn: () => Promise<T>) => Promise<T> }
  | { error: string; status: number }
> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) return { error: "Chưa chọn công ty", status: 400 };

  return {
    userId: user.id,
    companyId: active.companyId,
    run: <T>(fn: () => Promise<T>) => runWithTenantCompany(active.companyId, fn),
  };
}

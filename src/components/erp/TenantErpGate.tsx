import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isUltimateAdmin } from "@/lib/access/company-context";
import { getSessionUser } from "@/lib/auth";
import { getCompanyMembership } from "@/lib/projects/companies";
import { syncActiveCompanyFromContext } from "@/lib/active-company-sync";
import { resolveTenantCompany } from "@/lib/tenant-context";

const EXEMPT_PREFIXES = [
  "/erp/login",
  "/erp/dang-ky",
  "/erp/cho-duyet",
  "/erp/register",
];

function isExempt(pathname: string): boolean {
  return EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Trên subdomain công ty: chặn ERP khi chờ duyệt; ép đăng ký nếu chưa có hồ sơ */
export async function TenantErpGate({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  if (!pathname.startsWith("/erp") || isExempt(pathname)) {
    return <>{children}</>;
  }

  const tenant = await resolveTenantCompany();
  const user = await getSessionUser();

  if (tenant && user) {
    await syncActiveCompanyFromContext();
  }

  if (!tenant) return <>{children}</>;
  if (!user) return <>{children}</>;

  if (await isUltimateAdmin(user.id)) return <>{children}</>;

  const membership = await getCompanyMembership(tenant.id, user.id);

  if (!membership) {
    redirect("/erp/dang-ky");
  }

  if (membership.status === "pending") {
    redirect("/erp/cho-duyet");
  }

  if (membership.status === "rejected") {
    redirect("/erp/dang-ky?rejected=1");
  }

  return <>{children}</>;
}

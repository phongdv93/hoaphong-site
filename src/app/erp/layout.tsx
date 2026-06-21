import type { Metadata } from "next";
import { getActiveCompanyId, getCompany } from "@/lib/projects/companies";
import { resolveTenantCompany } from "@/lib/tenant-context";
import { TenantErpGate } from "@/components/erp/TenantErpGate";

/** ERP cần PostgreSQL — không prerender lúc build */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await resolveTenantCompany();
  if (tenant?.name) return { title: tenant.name };

  const activeId = await getActiveCompanyId();
  if (activeId) {
    const company = await getCompany(activeId);
    if (company?.name) return { title: company.name };
  }

  return { title: "ERP" };
}
export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return <TenantErpGate>{children}</TenantErpGate>;
}

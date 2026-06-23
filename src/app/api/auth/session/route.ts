import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getCompanyMembership } from "@/lib/projects/companies";
import { companyPublicCode } from "@/lib/projects/company-code";
import { resolveTenantCompany } from "@/lib/tenant-context";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null, tenant: null, membership: null });
  }

  const tenantCompany = await resolveTenantCompany();
  let membership = null;
  if (tenantCompany) {
    const m = await getCompanyMembership(tenantCompany.id, user.id);
    if (m) {
      membership = {
        companyId: tenantCompany.id,
        companyCode: companyPublicCode(tenantCompany),
        companyName: tenantCompany.name,
        ...m,
      };
    }
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    tenant: tenantCompany
      ? {
          id: tenantCompany.id,
          code: companyPublicCode(tenantCompany),
          name: tenantCompany.name,
        }
      : null,
    membership,
  });
}

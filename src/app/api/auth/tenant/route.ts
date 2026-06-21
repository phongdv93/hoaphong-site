import { NextResponse } from "next/server";
import { resolveTenantCompany } from "@/lib/tenant-context";
import { companyErpLoginUrl } from "@/lib/tenant-host";

export async function GET(req: Request) {
  const company = await resolveTenantCompany();
  if (!company) {
    return NextResponse.json({ company: null });
  }

  const host = req.headers.get("host") ?? undefined;
  return NextResponse.json({
    company: {
      id: company.id,
      code: company.code,
      name: company.name,
      erpUrl: companyErpLoginUrl(company.subdomain, host),
      subdomain: company.subdomain,
    },
  });
}

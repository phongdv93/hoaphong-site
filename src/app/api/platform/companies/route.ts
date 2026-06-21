import { NextResponse } from "next/server";
import { platformQuery } from "@/lib/db/platform";
import { requirePlatformAdmin } from "@/lib/platform/guard";

export async function GET() {
  const adminId = await requirePlatformAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Cần quyền Platform Admin" }, { status: 403 });
  }
  const rows = await platformQuery<Record<string, unknown>>(
    `SELECT c.id, c.code, c.subdomain, c.name, c.short_name, c.tax_code, c.email, c.phone, c.status, c.created_at,
            c.tenant_db_name,
            (SELECT COUNT(*) FROM company_members m WHERE m.company_id = c.id) AS member_count,
            (SELECT COUNT(*) FROM company_modules cm
              WHERE cm.company_id = c.id AND cm.enabled = TRUE
                AND (cm.expires_at IS NULL OR cm.expires_at >= CURRENT_DATE)) AS active_modules,
            (SELECT COALESCE(SUM(monthly_fee),0) FROM company_modules cm
              WHERE cm.company_id = c.id AND cm.enabled = TRUE
                AND (cm.expires_at IS NULL OR cm.expires_at >= CURRENT_DATE)) AS monthly_revenue
     FROM companies c
     ORDER BY c.created_at DESC`
  );
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      code: r.code,
      subdomain: ((r.subdomain as string) || (r.code as string)).trim(),
      name: r.name,
      shortName: r.short_name,
      taxCode: r.tax_code,
      email: r.email,
      phone: r.phone,
      status: r.status,
      createdAt: String(r.created_at),
      memberCount: Number(r.member_count ?? 0),
      tenantDbName: r.tenant_db_name ?? "",
      projectCount: 0,
      activeModules: Number(r.active_modules ?? 0),
      monthlyRevenue: Number(r.monthly_revenue ?? 0),
    }))
  );
}

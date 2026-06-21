import { redirect } from "next/navigation";
import { ErpShell } from "@/components/erp/ErpShell";
import { CompanyRegistrationsClient } from "@/components/platform/CompanyRegistrationsClient";
import { requirePlatformAdmin } from "@/lib/platform/guard";

export default async function PlatformCompanyRegistrationsPage() {
  const adminId = await requirePlatformAdmin();
  if (!adminId) redirect("/erp");

  return (
    <ErpShell title="Đăng ký doanh nghiệp">
      <CompanyRegistrationsClient />
    </ErpShell>
  );
}

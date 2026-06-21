import { redirect } from "next/navigation";
import { syncActiveCompanyFromContext } from "@/lib/active-company-sync";
import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { requirePlatformAdmin } from "@/lib/platform/guard";
import { PlatformCompanyHub } from "@/components/platform/PlatformCompanyHub";

export default async function PlatformCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminId = await requirePlatformAdmin();
  if (!adminId) redirect("/erp");
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isFinite(companyId)) redirect("/erp/platform/cong-ty");
  await syncActiveCompanyFromContext({ routeCompanyId: companyId });
  const hasDb = Boolean(process.env.DATABASE_URL);

  return (
    <ErpShell title="Công ty · Gói module">
      {!hasDb ? (
        <DbSetupBanner />
      ) : (
        <PlatformCompanyHub companyId={companyId} />
      )}
    </ErpShell>
  );
}

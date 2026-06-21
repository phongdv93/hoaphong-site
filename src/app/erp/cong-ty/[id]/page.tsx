import { syncActiveCompanyFromContext } from "@/lib/active-company-sync";
import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { CompanyDetailClient } from "@/components/projects/CompanyDetailClient";

export default async function CongTyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  if (Number.isFinite(companyId)) {
    await syncActiveCompanyFromContext({ routeCompanyId: companyId });
  }
  const hasDb = Boolean(process.env.DATABASE_URL);
  return (
    <ErpShell title="Chi tiết công ty">
      {!hasDb ? (
        <DbSetupBanner />
      ) : (
        <CompanyDetailClient companyId={companyId} />
      )}
    </ErpShell>
  );
}

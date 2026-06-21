import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { CompanyCreateForm } from "@/components/projects/CompanyCreateForm";

export default function CongTyNewPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  return (
    <ErpShell title="Tạo công ty mới">
      {!hasDb ? <DbSetupBanner /> : <CompanyCreateForm />}
    </ErpShell>
  );
}

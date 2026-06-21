import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { CompanyWebsiteClient } from "@/components/quan-tri/CompanyWebsiteClient";

export default function QuanTriWebsitePage() {
  return (
    <ErpShell title="Quản trị · Website công ty" groupId="quan-tri">
      <ModuleAccessGuard moduleId="quan-tri">
        <CompanyWebsiteClient />
      </ModuleAccessGuard>
    </ErpShell>
  );
}

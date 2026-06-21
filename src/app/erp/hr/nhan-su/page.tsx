import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { HrEmployeesClient } from "@/components/hr/HrEmployeesClient";

export default function HrNhanSuPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  return (
    <ErpShell title="Nhân sự · Hồ sơ nhân viên" groupId="hr">
      {!hasDb ? (
        <DbSetupBanner />
      ) : (
        <ModuleAccessGuard moduleId="hr">
          <HrEmployeesClient />
        </ModuleAccessGuard>
      )}
    </ErpShell>
  );
}

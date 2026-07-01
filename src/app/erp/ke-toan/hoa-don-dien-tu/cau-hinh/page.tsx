import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { MobifoneInvoiceProfileForm } from "@/components/einvoice/MobifoneInvoiceProfileForm";

export const metadata = {
  title: "Cấu hình HĐĐT | ERP",
};

export default function EinvoiceConfigPage() {
  return (
    <ErpShell title="Cấu hình MobiFone Invoice" groupId="ke-toan">
      <ModuleAccessGuard moduleId="ke-toan">
        <div className="p-4">
          <MobifoneInvoiceProfileForm />
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}

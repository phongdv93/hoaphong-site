import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { EinvoiceListClient } from "@/components/einvoice/EinvoiceListClient";

export const metadata = {
  title: "Hóa đơn điện tử | ERP",
};

export default function EinvoicePage() {
  return (
    <ErpShell title="Hóa đơn điện tử" groupId="ke-toan" fillHeight contentBleed>
      <ModuleAccessGuard moduleId="ke-toan">
        <EinvoiceListClient />
      </ModuleAccessGuard>
    </ErpShell>
  );
}

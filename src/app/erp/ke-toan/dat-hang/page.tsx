import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { AccountingPurchaseOrdersClient } from "@/components/purchase-orders/AccountingPurchaseOrdersClient";

export const metadata = {
  title: "Đơn đặt hàng | Kế toán",
};

export default function AccountingPurchaseOrdersPage() {
  return (
    <ErpShell title="Đơn đặt hàng" groupId="ke-toan">
      <ModuleAccessGuard moduleId="ke-toan">
        <div className="max-w-3xl">
          <AccountingPurchaseOrdersClient />
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}

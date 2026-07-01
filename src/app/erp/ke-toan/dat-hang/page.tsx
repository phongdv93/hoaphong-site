import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { PurchaseOrdersWorkspace } from "@/components/purchase-orders/PurchaseOrdersWorkspace";

export const metadata = {
  title: "Đơn đặt hàng | Kế toán",
};

export default function AccountingPurchaseOrdersPage() {
  const base = "/api/purchase-orders";
  return (
    <ErpShell title="Đơn đặt hàng" groupId="ke-toan">
      <ModuleAccessGuard moduleId="ke-toan">
        <div className="max-w-3xl">
          <PurchaseOrdersWorkspace
            listUrl={base}
            detailUrl={(poId) => `${base}/${poId}`}
            canEdit
            hint="Đơn mua hàng kế toán — không gắn dự án. Mỗi đơn một NCC; tìm sản phẩm theo tên, mô tả, NCC, hãng, xuất xứ, nguyên liệu BOM."
          />
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}

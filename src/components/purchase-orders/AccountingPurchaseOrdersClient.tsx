"use client";

import { PurchaseOrdersWorkspace } from "@/components/purchase-orders/PurchaseOrdersWorkspace";

export function AccountingPurchaseOrdersClient() {
  return (
    <PurchaseOrdersWorkspace
      listUrl="/api/purchase-orders"
      detailUrlPrefix="/api/purchase-orders"
      canEdit
      hint="Đơn mua hàng kế toán — không gắn dự án. Chọn NCC từ danh mục, sau đó thêm sản phẩm của NCC đó."
    />
  );
}

"use client";

import { PurchaseOrdersWorkspace } from "@/components/purchase-orders/PurchaseOrdersWorkspace";

export function AccountingPurchaseOrdersClient() {
  return (
    <PurchaseOrdersWorkspace
      listUrl="/api/purchase-orders"
      detailUrlPrefix="/api/purchase-orders"
      canEdit
      hint="Một danh sách đơn mua cho toàn công ty — gồm đơn từ dự án. Chọn NCC từ danh mục nhà cung cấp."
    />
  );
}

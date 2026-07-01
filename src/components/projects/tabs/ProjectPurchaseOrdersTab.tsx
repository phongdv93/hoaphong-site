"use client";

import type { ProjectItem } from "@/lib/projects/types";
import { PurchaseOrdersWorkspace } from "@/components/purchase-orders/PurchaseOrdersWorkspace";

export function ProjectPurchaseOrdersTab({
  projectId,
  items,
  canEdit,
}: {
  projectId: number;
  items: ProjectItem[];
  canEdit: boolean;
}) {
  const base = `/api/projects/${projectId}/purchase-orders`;
  return (
    <PurchaseOrdersWorkspace
      listUrl={base}
      detailUrlPrefix={base}
      projectId={projectId}
      projectItems={items}
      canEdit={canEdit}
      hint="Mỗi đơn gắn một nhà cung cấp — lấy dòng từ hạng mục dự án hoặc tìm trong danh mục sản phẩm."
    />
  );
}

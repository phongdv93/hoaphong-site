export type PurchaseOrderStatus = "draft" | "sent" | "confirmed" | "cancelled";

export interface PurchaseOrderLine {
  id: number;
  purchaseOrderId: number;
  lineNo: number;
  projectItemId: number | null;
  factoryProductId: number | null;
  name: string;
  description: string;
  productCode: string;
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  quantity: number;
  unit: string;
  unitPrice: string;
  brand: string;
  origin: string;
  remark: string;
}

export interface PurchaseOrder {
  id: number;
  companyId: number;
  projectId: number | null;
  poNumber: string;
  supplierId: number | null;
  supplierName: string;
  status: PurchaseOrderStatus;
  orderedAt: string | null;
  expectedAt: string | null;
  notes: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseOrderInput {
  supplierName: string;
  supplierId?: number | null;
  status?: PurchaseOrderStatus;
  orderedAt?: string | null;
  expectedAt?: string | null;
  notes?: string;
}

export interface PurchaseOrderLineInput {
  projectItemId?: number | null;
  factoryProductId?: number | null;
  name: string;
  description?: string;
  productCode?: string;
  lengthMm?: number;
  depthMm?: number;
  heightMm?: number;
  quantity?: number;
  unit?: string;
  unitPrice?: string;
  brand?: string;
  origin?: string;
  remark?: string;
}

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Nháp",
  sent: "Đã gửi NCC",
  confirmed: "NCC xác nhận",
  cancelled: "Đã hủy",
};

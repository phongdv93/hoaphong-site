/** Kiểu dùng chung client/server (không import pg) */

export type FactoryProductStatus = "draft" | "active" | "archived";

/** Nhóm BOM */
export type BomSection = "wood" | "hardware" | "packaging";

export const BOM_SECTION_LABELS: Record<BomSection, string> = {
  wood: "Chi tiết gỗ",
  hardware: "Vật tư hardware",
  packaging: "Bao bì",
};

export interface FactoryProduct {
  id: number;
  name: string;
  description: string;
  brand: string;
  origin: string;
  rangeCode: string;
  woodCode: string;
  paintCode: string;
  customerBranchCode: string;
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  price: string;
  supplier: string;
  orderedAt: string | null;
  sourceProjectId: number | null;
  cbmM3: number;
  weightKg: number;
  imageUrl: string;
  notes: string;
  status: FactoryProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FactoryPart {
  id: number;
  code: string;
  name: string;
  description: string;
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  defaultQty: number;
  unit: string;
  materialType: string;
  specNotes: string;
  createdFromProductId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FactoryBomLine {
  id: number;
  productId: number;
  bomSection: BomSection;
  lineNo: number;
  partId: number;
  qty: number;
  unit: string;
  remark: string;
  part: FactoryPart;
}

/** Một dòng BOM (mỗi dòng lưu → upsert chi tiết + kích thước 3 cột mm) */
export interface BomLineInput {
  partCode: string;
  name: string;
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  qty: number;
  unit: string;
  materialType: string;
  specNotes: string;
  remark: string;
}

export interface FactoryProductPayload {
  name: string;
  description?: string;
  brand?: string;
  origin?: string;
  supplier?: string;
  orderedAt?: string | null;
  sourceProjectId?: number | null;
  rangeCode?: string;
  woodCode?: string;
  paintCode?: string;
  customerBranchCode?: string;
  lengthMm?: number;
  depthMm?: number;
  heightMm?: number;
  price?: string;
  cbmM3?: number;
  weightKg?: number;
  imageUrl?: string;
  notes?: string;
  status?: FactoryProductStatus;
  /** BOM 3 phần */
  bomWood?: BomLineInput[];
  bomHardware?: BomLineInput[];
  bomPackaging?: BomLineInput[];
  /** @deprecated dùng bomWood */
  bom?: BomLineInput[];
}

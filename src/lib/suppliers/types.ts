export interface Supplier {
  id: number;
  companyId: number;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSupplierOffer {
  id: number;
  productId: number;
  supplierId: number;
  supplierName: string;
  unitPrice: string;
  leadTimeDays: number | null;
  currency: string;
  isPreferred: boolean;
  notes: string;
}

export interface ProductSupplierOfferInput {
  supplierId: number;
  unitPrice?: string;
  leadTimeDays?: number | null;
  currency?: string;
  isPreferred?: boolean;
  notes?: string;
}

export interface PoSupplierSuggestion {
  supplierId: number | null;
  supplierName: string;
  projectItemIds: number[];
  warnings: string[];
}

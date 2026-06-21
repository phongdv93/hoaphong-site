export type CustomerType = "dai_ly" | "du_an" | "le";

export type CustomerStatus = "active" | "inactive";

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  dai_ly: "Đại lý",
  du_an: "Dự án",
  le: "Khách lẻ",
};

export interface Customer {
  id: number;
  code: string;
  name: string;
  type: CustomerType;
  taxCode: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  notes: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

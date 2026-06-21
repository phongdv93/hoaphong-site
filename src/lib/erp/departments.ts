/**
 * Phòng ban / ban — dùng gắn module & phân quyền sau.
 * Hiện chỉ là danh mục tham chiếu, chưa chặn truy cập theo phòng.
 */
export interface Department {
  id: string;
  name: string;
  shortName?: string;
  sortOrder: number;
}

export const ERP_DEPARTMENTS: Department[] = [
  { id: "thiet-ke", name: "Phòng thiết kế", sortOrder: 10 },
  { id: "marketing", name: "Marketing", sortOrder: 20 },
  { id: "ke-toan", name: "Kế toán", sortOrder: 30 },
  { id: "nhan-su", name: "Nhân sự", sortOrder: 40 },
  { id: "kho", name: "Kho", sortOrder: 50 },
  { id: "giam-doc", name: "Ban giám đốc", sortOrder: 60 },
  { id: "quan-ly-sx", name: "Ban quản lý sản xuất", sortOrder: 70 },
  { id: "lao-dong", name: "Nhân lao động", sortOrder: 80 },
];

export function getDepartmentById(id: string): Department | undefined {
  return ERP_DEPARTMENTS.find((d) => d.id === id);
}

export function getDepartmentName(id: string): string {
  return getDepartmentById(id)?.name ?? id;
}

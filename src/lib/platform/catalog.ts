/**
 * Catalog các module có thể đăng ký cho mỗi công ty.
 * Module id KHỚP với ERP_MODULE_GROUPS[i].id trong src/lib/erp/modules.ts.
 *
 * Hoa Phong (super admin) sẽ bật/tắt từng module cho mỗi công ty và đặt giá thuê.
 */

/** Module bật mặc định khi tạo công ty mới (đăng ký tự phục vụ hoặc Premium tạo). */
export const NEW_COMPANY_DEFAULT_MODULE_IDS = ["du-an", "hr", "quan-tri"] as const;

export interface PlatformModule {
  id: string;
  name: string;
  description: string;
  /** Mặc định bật cho công ty mới (gói dùng thử miễn phí). */
  defaultForNewCompany: boolean;
  /** Module bắt buộc — luôn bật cho mọi công ty (ví dụ trang Cài đặt). */
  alwaysOn: boolean;
  /** Giá thuê hàng tháng gợi ý (Hoa Phong có thể chỉnh từng cty). */
  suggestedMonthlyFee: number;
}

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: "du-an",
    name: "Quản lý dự án",
    description: "Quản lý dự án xây dựng/nội thất, công đoạn, đội ngũ, chi phí",
    defaultForNewCompany: true,
    alwaysOn: false,
    suggestedMonthlyFee: 500_000,
  },
  {
    id: "san-pham",
    name: "Sản phẩm & BOM",
    description: "Sản phẩm, BOM đa cấp, định mức sơn, chi tiết tái sử dụng",
    defaultForNewCompany: false,
    alwaysOn: false,
    suggestedMonthlyFee: 800_000,
  },
  {
    id: "kho",
    name: "Kho",
    description: "Kho gỗ, vật tư, sơn, bao bì, thành phẩm",
    defaultForNewCompany: false,
    alwaysOn: false,
    suggestedMonthlyFee: 800_000,
  },
  {
    id: "marketing",
    name: "Marketing & Bán hàng",
    description: "CRM khách hàng, đơn hàng, công nợ",
    defaultForNewCompany: false,
    alwaysOn: false,
    suggestedMonthlyFee: 500_000,
  },
  {
    id: "xnk",
    name: "Xuất nhập khẩu",
    description: "Khai báo hải quan VNACCS — nhập khẩu tự động",
    defaultForNewCompany: false,
    alwaysOn: false,
    suggestedMonthlyFee: 1_200_000,
  },
  {
    id: "ke-toan",
    name: "Kế toán",
    description: "Phiếu thu/chi, công nợ phải trả, báo cáo tài chính cơ bản",
    defaultForNewCompany: false,
    alwaysOn: false,
    suggestedMonthlyFee: 600_000,
  },
  {
    id: "hr",
    name: "Nhân sự (HR)",
    description: "Hồ sơ NV, chấm công, nghỉ phép, lương sơ bộ",
    defaultForNewCompany: true,
    alwaysOn: false,
    suggestedMonthlyFee: 500_000,
  },
  {
    id: "quan-tri",
    name: "Quản trị hệ thống",
    description: "Người dùng, phân quyền, CMS website — luôn được bật",
    defaultForNewCompany: true,
    alwaysOn: true,
    suggestedMonthlyFee: 0,
  },
];

export function getModuleById(id: string): PlatformModule | undefined {
  return PLATFORM_MODULES.find((m) => m.id === id);
}

export function defaultModulesForNewCompany(): string[] {
  const ids = new Set<string>([...NEW_COMPANY_DEFAULT_MODULE_IDS]);
  for (const id of alwaysOnModuleIds()) ids.add(id);
  return [...ids];
}

export function alwaysOnModuleIds(): Set<string> {
  return new Set(PLATFORM_MODULES.filter((m) => m.alwaysOn).map((m) => m.id));
}

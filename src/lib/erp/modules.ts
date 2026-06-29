import type { LucideIcon } from "lucide-react";
import {
  Trees,
  Package,
  Droplets,
  Box,
  Factory,
  Layers,
  Paintbrush,
  Puzzle,
  Calculator,
  Receipt,
  Wallet,
  FileSpreadsheet,
  FileText,
  Users,
  ShoppingCart,
  BadgeDollarSign,
  Shield,
  UserCog,
  Bell,
  ClipboardList,
  Globe,
  Briefcase,
  CalendarDays,
  UserPlus,
  Award,
  FolderKanban,
  ListChecks,
  Mail,
} from "lucide-react";
import { ERP } from "@/lib/paths";
import type { Department } from "@/lib/erp/departments";

export type ModuleStatus = "active" | "beta" | "planned";

/** Id phòng ban — xem src/lib/erp/departments.ts (phân quyền sau) */
export type DepartmentId = Department["id"];

export interface ErpModuleItem {
  id: string;
  title: string;
  description: string;
  href: string;
  status: ModuleStatus;
  icon: LucideIcon;
  /** Phòng ban chủ trì (gợi ý, chưa chặn quyền) */
  ownerDepartmentId?: DepartmentId;
  /** Màn hình dự kiến — hiển thị trên trang stub */
  plannedFeatures?: string[];
}

export interface ErpModuleGroup {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  /** Phòng ban chủ trì nhóm module */
  ownerDepartmentId?: DepartmentId;
  items: ErpModuleItem[];
}

export const ERP_MODULE_GROUPS: ErpModuleGroup[] = [
  {
    id: "du-an",
    title: "Quản lý dự án",
    description: "Đa công ty: dự án xây dựng/nội thất, công đoạn, đội ngũ, chi phí",
    icon: FolderKanban,
    href: "/erp/du-an",
    ownerDepartmentId: "giam-doc",
    items: [
      {
        id: "danh-sach",
        title: "Dự án",
        description: "Danh sách dự án trong công ty đang chọn",
        href: "/erp/du-an",
        status: "active",
        icon: ListChecks,
      },
      {
        id: "khach-hang",
        title: "Khách hàng",
        description: "Khách hàng gắn với dự án / hợp đồng",
        href: "/erp/marketing/khach-hang",
        status: "active",
        icon: Users,
      },
    ],
  },
  {
    id: "san-pham",
    title: "Sản phẩm",
    description: "BOM, định mức sơn, chi tiết sản xuất",
    icon: Layers,
    href: "/erp/san-pham",
    ownerDepartmentId: "thiet-ke",
    items: [
      {
        id: "bom",
        title: "Sản phẩm & BOM",
        description: "Thông tin SP, BOM dạng bảng; mỗi dòng lưu → chi tiết tái sử dụng",
        href: "/erp/san-pham/san-pham",
        status: "active",
        icon: Layers,
        plannedFeatures: [
          "BOM đa cấp (sản phẩm → bộ phận → chi tiết)",
          "Liên kết mã vật tư kho & mã gỗ",
          "Phiên bản BOM theo ngày hiệu lực",
        ],
      },
      {
        id: "dinh-muc-son",
        title: "Định mức sơn",
        description: "Lượng sơn/m², số lớp, loại sơn theo bề mặt & màu",
        href: "/erp/san-pham/dinh-muc-son",
        status: "planned",
        icon: Paintbrush,
        plannedFeatures: ["Định mức theo loại bề mặt", "Tính kg/lít tự động từ diện tích", "Gắn BOM chi tiết"],
      },
      {
        id: "chi-tiet",
        title: "Danh mục chi tiết",
        description: "Mã chi tiết tạo từ BOM — dùng lại cho SX & gia công",
        href: "/erp/san-pham/chi-tiet",
        status: "active",
        icon: Puzzle,
        plannedFeatures: ["Mã chi tiết, bản vẽ, kích thước", "Quy trình gia công", "Ảnh & file SolidWorks"],
      },
    ],
  },
  {
    id: "kho",
    title: "Kho",
    description: "Gỗ, vật tư, sơn, bao bì, thành phẩm",
    icon: Package,
    href: "/erp/kho",
    ownerDepartmentId: "kho",
    items: [
      {
        id: "go",
        title: "Kho gỗ",
        description: "Nhập kiện, 3D, phát gỗ theo PO — đang dùng được",
        href: ERP.khoGo,
        status: "active",
        icon: Trees,
      },
      {
        id: "vat-tu",
        title: "Kho vật tư",
        description: "Ốc, keo, phụ kiện, vật tư phụ trợ SX",
        href: "/erp/kho/vat-tu",
        status: "planned",
        icon: Box,
        plannedFeatures: ["Nhập/xuất theo PO & phiếu SX", "Tồn tối thiểu", "Barcode"],
      },
      {
        id: "son",
        title: "Kho sơn",
        description: "Sơn base, top, hardener — theo lô & HSD",
        href: "/erp/kho/son",
        status: "planned",
        icon: Droplets,
        plannedFeatures: ["Quản lý lô & hạn dùng", "Xuất theo định mức SX", "Cảnh báo tồn thấp"],
      },
      {
        id: "bao-bi",
        title: "Kho bao bì",
        description: "Thùng, màng co, pallet, nhãn",
        href: "/erp/kho/bao-bi",
        status: "planned",
        icon: Package,
        plannedFeatures: ["Định mức bao bì/đơn", "Tồn theo kích thước SP"],
      },
      {
        id: "thanh-pham",
        title: "Kho thành phẩm",
        description: "Sản phẩm hoàn thiện chờ giao",
        href: "/erp/kho/thanh-pham",
        status: "planned",
        icon: Factory,
        plannedFeatures: ["Nhập kho TP từ SX", "Gắn đơn giao", "Serial / vị trí kệ"],
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing & Bán hàng",
    description: "Khách hàng, đơn hàng, công nợ",
    icon: ShoppingCart,
    href: "/erp/marketing",
    ownerDepartmentId: "marketing",
    items: [
      {
        id: "khach-hang",
        title: "Khách hàng",
        description: "CRM: thông tin, liên hệ, lịch sử mua",
        href: "/erp/marketing/khach-hang",
        status: "active",
        icon: Users,
        ownerDepartmentId: "marketing",
      },
      {
        id: "bao-gia",
        title: "Báo giá",
        description: "Lập báo giá, lưu danh mục SP, xuất PDF",
        href: "/erp/marketing/bao-gia",
        status: "active",
        icon: FileText,
        ownerDepartmentId: "marketing",
      },
      {
        id: "hop-thu",
        title: "Hộp thư",
        description: "Đọc và gửi email công ty (contact@…)",
        href: "/erp/marketing/hop-thu",
        status: "active",
        icon: Mail,
        ownerDepartmentId: "marketing",
      },
      {
        id: "don-hang",
        title: "Đơn hàng bán",
        description: "Báo giá → đơn hàng → giao hàng",
        href: "/erp/marketing/don-hang",
        status: "planned",
        icon: ClipboardList,
        plannedFeatures: ["Trạng thái đơn", "Gắn BOM & lịch SX", "In phiếu giao"],
      },
      {
        id: "cong-no",
        title: "Công nợ (phải thu)",
        description: "Theo dõi thu tiền theo đơn / khách",
        href: "/erp/marketing/cong-no",
        status: "planned",
        icon: BadgeDollarSign,
        plannedFeatures: ["Tuổi nợ", "Lịch thu", "Đối soát với kế toán"],
      },
    ],
  },
  {
    id: "xnk",
    title: "Xuất nhập khẩu",
    description: "Khai báo hải quan VNACCS — nhập khẩu IDA/IDC",
    icon: Globe,
    href: "/erp/xnk",
    ownerDepartmentId: "ke-toan",
    items: [
      {
        id: "hai-quan-nhap",
        title: "Khai báo nhập khẩu",
        description: "Tờ khai điện tử, truyền VNACCS",
        href: "/erp/xnk/hai-quan-nhap",
        status: "beta",
        icon: ClipboardList,
      },
      {
        id: "cau-hinh-vnaccs",
        title: "Cấu hình VNACCS",
        description: "User Code, Terminal ID, gateway",
        href: "/erp/xnk/cau-hinh",
        status: "beta",
        icon: Shield,
      },
      {
        id: "danh-muc-hai-quan",
        title: "Danh mục mã hải quan",
        description: "Import và tra cứu danh mục mã HQ chuẩn",
        href: "/erp/xnk/danh-muc",
        status: "beta",
        icon: ListChecks,
      },
    ],
  },
  {
    id: "ke-toan",
    title: "Kế toán",
    description: "Thu chi, công nợ, báo cáo tài chính cơ bản",
    icon: Calculator,
    href: "/erp/ke-toan",
    ownerDepartmentId: "ke-toan",
    items: [
      {
        id: "phieu-thu",
        title: "Phiếu thu",
        description: "Ghi nhận thu tiền từ khách / nguồn khác",
        href: "/erp/ke-toan/phieu-thu",
        status: "planned",
        icon: Wallet,
        plannedFeatures: ["Gắn đơn hàng & công nợ", "Hình thức thanh toán", "In chứng từ"],
      },
      {
        id: "phieu-chi",
        title: "Phiếu chi",
        description: "Chi mua hàng, lương, chi phí SX",
        href: "/erp/ke-toan/phieu-chi",
        status: "planned",
        icon: Receipt,
        plannedFeatures: ["Phân loại chi phí", "Duyệt chi", "Đính kèm hóa đơn"],
      },
      {
        id: "cong-no-phai-tra",
        title: "Công nợ phải trả",
        description: "Nợ nhà cung cấp, lịch thanh toán",
        href: "/erp/ke-toan/cong-no-phai-tra",
        status: "planned",
        icon: BadgeDollarSign,
        plannedFeatures: ["Theo NCC", "Nhắc hạn trả", "Đối soát mua hàng"],
      },
      {
        id: "bao-cao",
        title: "Báo cáo",
        description: "Bảng cân đối sơ bộ, P&L, sổ quỹ",
        href: "/erp/ke-toan/bao-cao",
        status: "planned",
        icon: FileSpreadsheet,
        plannedFeatures: ["Sổ quỹ", "Báo cáo lãi lỗ đơn giản", "Xuất PDF/Excel"],
      },
    ],
  },
  {
    id: "quan-tri",
    title: "Quản trị hệ thống",
    description: "User, phân quyền, đơn chạy, duyệt",
    icon: Shield,
    href: "/erp/quan-tri",
    ownerDepartmentId: "giam-doc",
    items: [
      {
        id: "users",
        title: "Người dùng",
        description: "Tài khoản đăng nhập ERP",
        href: "/erp/quan-tri/users",
        status: "planned",
        icon: UserCog,
        plannedFeatures: ["Thêm/sửa/khóa user", "Gán vai trò", "Reset mật khẩu"],
      },
      {
        id: "phan-quyen",
        title: "Phân quyền",
        description: "Vai trò × module × thao tác",
        href: "/erp/quan-tri/phan-quyen",
        status: "active",
        icon: Shield,
        plannedFeatures: ["Role: Admin, Kho, SX, KT…", "Quyền xem/sửa/duyệt", "Audit log"],
      },
      {
        id: "don-hang-sx",
        title: "Đơn đang chạy (SX)",
        description: "Tổng hợp PO / lệnh SX đang sản xuất",
        href: "/erp/quan-tri/don-hang-dang-chay",
        status: "planned",
        icon: Factory,
        ownerDepartmentId: "quan-ly-sx",
        plannedFeatures: ["Kanban tiến độ", "Gắn kho & BOM", "Cảnh báo trễ"],
      },
      {
        id: "thong-bao",
        title: "Thông báo & duyệt",
        description: "Hàng chờ duyệt: chi, xuất kho, báo giá…",
        href: "/erp/quan-tri/thong-bao",
        status: "planned",
        icon: Bell,
        plannedFeatures: ["Hộp thư duyệt", "Push / email", "Lịch sử duyệt"],
      },
      {
        id: "website",
        title: "Website công ty",
        description: "Liên kết website giới thiệu của công ty bạn",
        href: "/erp/quan-tri/website",
        status: "active",
        icon: Globe,
      },
    ],
  },
  {
    id: "hr",
    title: "Nhân sự (HR)",
    description: "Hồ sơ NV, chấm công, nghỉ phép, lương cơ bản",
    icon: Briefcase,
    href: "/erp/hr",
    ownerDepartmentId: "nhan-su",
    items: [
      {
        id: "nhan-su",
        title: "Hồ sơ nhân viên",
        description: "Thêm nhân sự công ty để gán vào dự án thử",
        href: "/erp/hr/nhan-su",
        status: "active",
        icon: Users,
        plannedFeatures: ["Phòng ban / chức danh", "Hợp đồng & phụ lục", "Tài liệu đính kèm"],
      },
      {
        id: "cham-cong",
        title: "Chấm công",
        description: "Ca làm, tăng ca, công đi làm",
        href: "/erp/hr/cham-cong",
        status: "planned",
        icon: CalendarDays,
        plannedFeatures: ["Bảng công tháng", "Tích hợp máy chấm công", "Duyệt tăng ca"],
      },
      {
        id: "nghi-phep",
        title: "Nghỉ phép / OT",
        description: "Đơn xin nghỉ, phê duyệt",
        href: "/erp/hr/nghi-phep",
        status: "planned",
        icon: UserPlus,
        plannedFeatures: ["Số ngày phép còn", "Workflow duyệt", "Lịch team"],
      },
      {
        id: "bang-luong",
        title: "Bảng lương (sơ bộ)",
        description: "Tổng hợp lương theo công — chưa thay phần mềm KT",
        href: "/erp/hr/bang-luong",
        status: "planned",
        icon: Award,
        plannedFeatures: ["Phụ cấp / khấu trừ", "Export cho kế toán", "Phiếu lương PDF"],
      },
    ],
  },
];

export function getGroupById(groupId: string): ErpModuleGroup | undefined {
  return ERP_MODULE_GROUPS.find((g) => g.id === groupId);
}

export function getModuleByPath(groupId: string, subId?: string): ErpModuleItem | ErpModuleGroup | null {
  const group = getGroupById(groupId);
  if (!group) return null;
  if (!subId) return group;
  return group.items.find((i) => i.id === subId) ?? null;
}

export function flattenModules(): ErpModuleItem[] {
  return ERP_MODULE_GROUPS.flatMap((g) => g.items);
}

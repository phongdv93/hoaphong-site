import type { CustomsChannel, DeclarationStatus, VnaccsProcedure } from "./types";

export const CUSTOMS_MODULE_ID = "xnk";

export const DECLARATION_STATUS_LABELS: Record<DeclarationStatus, string> = {
  draft: "Nháp",
  validated: "Đã kiểm tra",
  transmitting: "Đang truyền",
  submitted: "Đã gửi HQ",
  accepted: "Chấp nhận",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
};

export const DECLARATION_STATUS_TONES: Record<DeclarationStatus, string> = {
  draft: "bg-white/10 text-slate-300",
  validated: "bg-sky/20 text-sky-light",
  transmitting: "bg-amber-500/20 text-amber-200",
  submitted: "bg-indigo-500/20 text-indigo-200",
  accepted: "bg-emerald-500/20 text-emerald-200",
  rejected: "bg-rose-500/20 text-rose-300",
  cancelled: "bg-white/5 text-slate-500",
};

export const CHANNEL_LABELS: Record<CustomsChannel, string> = {
  green: "Luồng xanh",
  yellow: "Luồng vàng",
  red: "Luồng đỏ",
  unknown: "Chưa phân luồng",
};

export const PROCEDURE_LABELS: Record<VnaccsProcedure, string> = {
  IDA: "Đăng ký trước (IDA)",
  IDB: "Lấy thông tin IDA (IDB)",
  IDC: "Khai chính thức (IDC)",
  IDA01: "Sửa IDA (IDA01)",
  IDE: "Sửa tờ khai (IDE)",
};

/** Mã loại hình NK thường dùng */
export const PROCEDURE_TYPE_OPTIONS = [
  { value: "A11", label: "A11 — NK kinh doanh" },
  { value: "A12", label: "A12 — NK sản xuất xuất khẩu" },
  { value: "A21", label: "A21 — Gia công" },
  { value: "B11", label: "B11 — NK hàng gia công" },
];

export const TRANSPORT_MODE_OPTIONS = [
  { value: "1", label: "1 — Đường biển" },
  { value: "2", label: "2 — Đường hàng không" },
  { value: "3", label: "3 — Đường bộ" },
  { value: "4", label: "4 — Đường sắt" },
];

export const INCOTERMS_OPTIONS = [
  "EXW",
  "FCA",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "L", label: "L — Trả ngay" },
  { value: "D", label: "D — Trả chậm" },
  { value: "KC", label: "KC — Chuyển khoản (CPN)" },
  { value: "M", label: "M — Miễn/trả khác" },
];

export const PARTY_CLASSIFICATION_OPTIONS = [
  { value: "1", label: "1 — Cá nhân gửi cá nhân" },
  { value: "2", label: "2 — Cá nhân gửi tổ chức" },
  { value: "3", label: "3 — Tổ chức gửi cá nhân" },
  { value: "4", label: "4 — Tổ chức gửi tổ chức" },
];

import type {
  CompanyMemberRole,
  CompanyMemberStatus,
  CompanyStatus,
  PhaseKind,
  PhaseStatus,
  ProjectMemberRole,
  ProjectStatus,
} from "./types";

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active: "Đang hoạt động",
  suspended: "Tạm dừng",
};

export const COMPANY_ROLE_LABELS: Record<CompanyMemberRole, string> = {
  admin: "Quản trị công ty",
  manager: "Quản lý",
  member: "Nhân viên",
};

export const COMPANY_MEMBER_STATUS_LABELS: Record<CompanyMemberStatus, string> = {
  pending: "Chờ duyệt",
  active: "Đã duyệt",
  rejected: "Từ chối",
};

/** Quyền chỉ với role trong COMPANY (không phải trong project) */
export const COMPANY_ROLES_CAN_MANAGE: CompanyMemberRole[] = ["admin", "manager"];
export const COMPANY_ROLES_CAN_INVITE: CompanyMemberRole[] = ["admin"];

export const DEFAULT_PHASES: { kind: PhaseKind; name: string }[] = [
  { kind: "design", name: "Thiết kế" },
  { kind: "drawing", name: "Bản vẽ kỹ thuật" },
  { kind: "structural", name: "Xây dựng phần thô" },
  { kind: "finishing", name: "Hoàn thiện" },
  { kind: "mep", name: "Cơ điện (MEP)" },
  { kind: "interior", name: "Nội thất" },
  { kind: "landscape", name: "Cảnh quan" },
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  open: "Mới mở",
  in_progress: "Đang thi công",
  on_hold: "Tạm dừng",
  done: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const PROJECT_STATUS_TONES: Record<ProjectStatus, string> = {
  open: "bg-sky/20 text-sky-light",
  in_progress: "bg-amber-500/20 text-amber-200",
  on_hold: "bg-white/10 text-slate-400",
  done: "bg-emerald-500/20 text-emerald-200",
  cancelled: "bg-rose-500/20 text-rose-200",
};

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  pending: "Chưa bắt đầu",
  in_progress: "Đang làm",
  done: "Hoàn thành",
  delayed: "Trễ hạn",
};

export const PHASE_STATUS_TONES: Record<PhaseStatus, string> = {
  pending: "bg-white/10 text-slate-300",
  in_progress: "bg-amber-500/20 text-amber-200",
  done: "bg-emerald-500/20 text-emerald-200",
  delayed: "bg-rose-500/20 text-rose-200",
};

export const MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: "Chủ trì",
  manager: "Quản lý",
  member: "Thành viên",
  viewer: "Chỉ xem",
};

export const PHASE_KIND_LABELS: Record<PhaseKind, string> = {
  design: "Thiết kế",
  drawing: "Bản vẽ kỹ thuật",
  structural: "Xây thô",
  finishing: "Hoàn thiện",
  mep: "MEP",
  interior: "Nội thất",
  landscape: "Cảnh quan",
  custom: "Khác",
};

/** Quyền duyệt chi tiêu trong dự án — đợt 2 sẽ dùng */
export const CAN_APPROVE_EXPENSE: ProjectMemberRole[] = ["owner", "manager"];

export const PROJECT_ITEM_STATUS_LABELS: Record<
  import("./types").ProjectItemStatus,
  string
> = {
  open: "Mới",
  in_progress: "Đang làm",
  done: "Xong",
  cancelled: "Hủy",
};

export const SUBMISSION_KIND_LABELS: Record<
  import("./types").ProjectSubmissionKind,
  string
> = {
  request: "Yêu cầu",
  report: "Báo cáo",
  proposal: "Đề xuất",
};

export const SUBMISSION_STATUS_LABELS: Record<
  import("./types").ProjectSubmissionStatus,
  string
> = {
  submitted: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export const SUBMISSION_STATUS_TONES: Record<
  import("./types").ProjectSubmissionStatus,
  string
> = {
  submitted: "bg-amber-500/20 text-amber-200",
  approved: "bg-emerald-500/20 text-emerald-200",
  rejected: "bg-rose-500/20 text-rose-200",
};

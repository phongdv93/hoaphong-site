/**
 * Module: Quản lý dự án (multi-tenant)
 * Mỗi công ty có không gian dữ liệu riêng. Dự án thuộc 1 công ty.
 */

export type CompanyStatus = "active" | "suspended";
export type CompanyMemberRole = "admin" | "manager" | "member";
/** pending = đăng ký subdomain, chờ admin duyệt */
export type CompanyMemberStatus = "pending" | "active" | "rejected";

export interface Company {
  id: number;
  code: string;
  /** Host ERP: {subdomain}.hoaphong.com.vn — mặc định = code */
  subdomain: string;
  name: string;
  shortName: string;
  taxCode: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  /** Website giới thiệu công ty (URL đầy đủ hoặc domain) — để trống = chưa liên kết */
  websiteUrl: string;
  status: CompanyStatus;
  notes: string;
  createdBy: number | null;
  tenantDbName: string;
  tenantDbUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMember {
  companyId: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  role: CompanyMemberRole;
  status: CompanyMemberStatus;
  departmentId?: string | null;
  moduleIds?: string[];
  joinedAt: string;
}

export interface CompanySummary extends Company {
  /** Role của user hiện tại trong công ty này */
  myRole: CompanyMemberRole;
  memberCount: number;
  projectCount: number;
}

export type ProjectStatus = "open" | "in_progress" | "on_hold" | "done" | "cancelled";

export type PhaseKind =
  | "design"
  | "drawing"
  | "structural"
  | "finishing"
  | "mep"
  | "interior"
  | "landscape"
  | "custom";

export type PhaseStatus = "pending" | "in_progress" | "done" | "delayed";

export type ProjectMemberRole = "owner" | "manager" | "member" | "viewer";

export interface Project {
  id: number;
  companyId: number;
  code: string;
  name: string;
  customerId: number | null;
  customerName?: string;
  contractValue: number;
  contractSignedAt: string | null;
  status: ProjectStatus;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  address: string;
  notes: string;
  supplierAddress: string;
  exportCountry: string;
  completedLateDays: number;
  deletedAt: string | null;
  managerUserId: number | null;
  managerName?: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhase {
  id: number;
  projectId: number;
  kind: PhaseKind;
  name: string;
  sortOrder: number;
  deadlineAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: PhaseStatus;
  assigneeUserId: number | null;
  assigneeName?: string;
  progressPercent: number;
  notes: string;
  lastProgressAt: string | null;
  lastProgressBy: number | null;
  lastProgressByName?: string;
  /** true = % tự tính từ tổng SL/Có của hạng mục dự án */
  progressFromItems: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhaseProgressLog {
  id: number;
  projectId: number;
  phaseId: number;
  userId: number | null;
  userName?: string;
  progressPercent: number;
  status: PhaseStatus;
  note: string;
  photoUrls: string[];
  createdAt: string;
}

export interface ProjectMember {
  projectId: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  role: ProjectMemberRole;
  joinedAt: string;
}

/** Công đoạn rút gọn cho vẽ trên thanh Gantt */
export interface ProjectGanttPhase {
  id: number;
  name: string;
  status: PhaseStatus;
  deadlineAt: string | null;
  startedAt: string | null;
  sortOrder: number;
  /** % hoàn thành công đoạn (giám sát cập nhật) */
  progressPercent: number;
}

export interface ProjectSummary extends Project {
  phaseCount: number;
  phaseDoneCount: number;
  memberCount: number;
  /** Số công đoạn quá hạn hoặc status=delayed */
  phaseDelayedCount: number;
  /** Công đoạn để vẽ phân đoạn trên thanh timeline */
  phases: ProjectGanttPhase[];
}

export type ProjectSubmissionKind = "request" | "report" | "proposal";
export type ProjectSubmissionStatus = "submitted" | "approved" | "rejected";

export interface ProjectSubmission {
  id: number;
  projectId: number;
  phaseId: number | null;
  phaseName?: string;
  kind: ProjectSubmissionKind;
  title: string;
  summary: string;
  detail: string;
  status: ProjectSubmissionStatus;
  createdBy: number | null;
  creatorName?: string;
  reviewedBy: number | null;
  reviewerName?: string;
  reviewNote: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMessage {
  id: number;
  projectId: number;
  userId: number | null;
  userName?: string;
  body: string;
  submissionId: number | null;
  submission?: ProjectSubmission | null;
  createdAt: string;
}

export interface ProjectFile {
  id: number;
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number | null;
  uploaderName?: string;
  createdAt: string;
}

export type ProjectItemStatus = "open" | "in_progress" | "done" | "cancelled";

export interface ProjectItem {
  id: number;
  projectId: number;
  name: string;
  description: string;
  /** Số lượng kế hoạch / cần làm */
  quantity: number;
  /** Số lượng đã có / đã hoàn thành (theo dõi tiến độ chung khi chưa gán công đoạn) */
  quantityDone: number;
  unit: string;
  unitPrice: number;
  /** Nhà cung cấp / mua từ đâu */
  supplier: string;
  /** Ngày đặt hàng */
  orderedAt: string | null;
  /** SL đã làm theo từng công đoạn (phaseId → quantity_done) */
  phaseDone: Record<number, number>;
  status: ProjectItemStatus;
  sortOrder: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWorkspace {
  project: Project;
  phases: ProjectPhase[];
  members: ProjectMember[];
  messages: ProjectMessage[];
  submissions: ProjectSubmission[];
  progressLogs?: PhaseProgressLog[];
  files: ProjectFile[];
  items: ProjectItem[];
  myRole: ProjectMemberRole | null;
}

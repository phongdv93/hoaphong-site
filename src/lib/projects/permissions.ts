import { tenantQueryOne } from "@/lib/db/tenant";
import { getEffectiveCompanyRole, isUltimateAdmin } from "@/lib/access/company-context";
import { getMemberRole } from "./repository";
import type { CompanyMemberRole, ProjectMemberRole } from "./types";

/** Có quyền sửa toàn bộ dự án (đổi giá HĐ, đóng dự án, xóa…) */
const ROLES_EDIT_PROJECT: ProjectMemberRole[] = ["owner", "manager"];

/** Có quyền thêm/xóa công đoạn & gán người làm */
const ROLES_EDIT_PHASE: ProjectMemberRole[] = ["owner", "manager"];

/** Có quyền quản lý thành viên */
const ROLES_MANAGE_MEMBERS: ProjectMemberRole[] = ["owner", "manager"];

/** Cập nhật % hoàn thành công đoạn */
const ROLES_UPDATE_PROGRESS: ProjectMemberRole[] = ["owner", "manager", "member"];

/** Gửi yêu cầu / báo cáo / đề xuất */
const ROLES_SUBMIT: ProjectMemberRole[] = ["owner", "manager", "member"];

/** Duyệt yêu cầu */
const ROLES_REVIEW_SUBMISSION: ProjectMemberRole[] = ["owner", "manager"];

async function getProjectCompanyId(projectId: number): Promise<number | null> {
  const row = await tenantQueryOne<{ company_id: number }>(
    `SELECT company_id FROM projects WHERE id = $1`,
    [projectId]
  );
  return row?.company_id ?? null;
}

/**
 * Vai trò hiệu lực trên dự án:
 * - Ultimate Hoa Phong → owner mọi dự án
 * - Admin công ty → owner mọi dự án thuộc công ty đó
 * - Còn lại → vai trò trong project_members
 */
async function resolveProjectMemberRole(
  projectId: number,
  userId: number
): Promise<ProjectMemberRole | null> {
  if (await isUltimateAdmin(userId)) return "owner";

  const companyId = await getProjectCompanyId(projectId);
  if (companyId) {
    const companyRole = await getEffectiveCompanyRole(companyId, userId);
    if (companyRole === "admin") return "owner";
  }

  return getMemberRole(projectId, userId);
}

export async function canViewProject(
  projectId: number,
  userId: number
): Promise<{ ok: boolean; role: ProjectMemberRole | null }> {
  const role = await resolveProjectMemberRole(projectId, userId);
  return { ok: role !== null, role };
}

export async function canEditProject(projectId: number, userId: number): Promise<boolean> {
  const role = await resolveProjectMemberRole(projectId, userId);
  return role !== null && ROLES_EDIT_PROJECT.includes(role);
}

/** Sửa thông tin dự án (mã, tên, HĐ, địa chỉ…) — chỉ quản trị công ty / ultimate */
export async function canEditProjectMeta(projectId: number, userId: number): Promise<boolean> {
  if (await isUltimateAdmin(userId)) return true;
  const companyId = await getProjectCompanyId(projectId);
  if (!companyId) return false;
  const companyRole = await getEffectiveCompanyRole(companyId, userId);
  return companyRole === "admin";
}

export async function canEditPhase(projectId: number, userId: number): Promise<boolean> {
  const role = await resolveProjectMemberRole(projectId, userId);
  return role !== null && ROLES_EDIT_PHASE.includes(role);
}

export async function canManageMembers(
  projectId: number,
  userId: number
): Promise<boolean> {
  const role = await resolveProjectMemberRole(projectId, userId);
  return role !== null && ROLES_MANAGE_MEMBERS.includes(role);
}

export async function canUpdatePhaseProgress(
  projectId: number,
  userId: number
): Promise<boolean> {
  const role = await resolveProjectMemberRole(projectId, userId);
  return role !== null && ROLES_UPDATE_PROGRESS.includes(role);
}

export async function canSubmitToProject(
  projectId: number,
  userId: number
): Promise<boolean> {
  const role = await resolveProjectMemberRole(projectId, userId);
  return role !== null && ROLES_SUBMIT.includes(role);
}

export async function canReviewSubmission(
  projectId: number,
  userId: number
): Promise<boolean> {
  const role = await resolveProjectMemberRole(projectId, userId);
  return role !== null && ROLES_REVIEW_SUBMISSION.includes(role);
}

// ============ COMPANY-LEVEL ============

const COMPANY_ROLES_CAN_CREATE_PROJECT: CompanyMemberRole[] = ["admin", "manager"];
const COMPANY_ROLES_CAN_MANAGE: CompanyMemberRole[] = ["admin"];

export async function canAccessCompany(
  companyId: number,
  userId: number
): Promise<CompanyMemberRole | null> {
  return getEffectiveCompanyRole(companyId, userId);
}

export async function canCreateProject(
  companyId: number,
  userId: number
): Promise<boolean> {
  const role = await getEffectiveCompanyRole(companyId, userId);
  return role !== null && COMPANY_ROLES_CAN_CREATE_PROJECT.includes(role);
}

export async function canManageCompany(
  companyId: number,
  userId: number
): Promise<boolean> {
  const role = await getEffectiveCompanyRole(companyId, userId);
  return role !== null && COMPANY_ROLES_CAN_MANAGE.includes(role);
}

/** Khai báo hải quan / cấu hình VNACCS */
export async function canManageCustoms(
  companyId: number,
  userId: number
): Promise<boolean> {
  if (await isUltimateAdmin(userId)) return true;
  const role = await getEffectiveCompanyRole(companyId, userId);
  return role === "admin" || role === "manager";
}

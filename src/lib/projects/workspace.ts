import { tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import type {
  ProjectFile,
  ProjectItem,
  ProjectMessage,
  ProjectSubmission,
  ProjectSubmissionKind,
  ProjectSubmissionStatus,
} from "./types";

function mapMessage(row: Record<string, unknown>): ProjectMessage {
  const submissionId = (row.submission_id as number | null) ?? null;
  let submission: ProjectSubmission | null = null;
  if (submissionId && row.submission_title) {
    submission = {
      id: submissionId,
      projectId: row.project_id as number,
      phaseId: (row.sub_phase_id as number | null) ?? null,
      phaseName: (row.sub_phase_name as string | undefined) ?? undefined,
      kind: row.submission_kind as ProjectSubmissionKind,
      title: row.submission_title as string,
      summary: (row.submission_summary as string) ?? "",
      detail: (row.submission_detail as string) ?? "",
      status: row.submission_status as ProjectSubmissionStatus,
      createdBy: (row.sub_created_by as number | null) ?? null,
      creatorName: (row.sub_creator_name as string | undefined) ?? undefined,
      reviewedBy: (row.sub_reviewed_by as number | null) ?? null,
      reviewerName: (row.sub_reviewer_name as string | undefined) ?? undefined,
      reviewNote: (row.sub_review_note as string) ?? "",
      reviewedAt: row.sub_reviewed_at ? String(row.sub_reviewed_at) : null,
      createdAt: String(row.sub_created_at ?? row.created_at),
      updatedAt: String(row.sub_updated_at ?? row.created_at),
    };
  }
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    userId: (row.user_id as number | null) ?? null,
    userName: (row.user_name as string | undefined) ?? undefined,
    body: (row.body as string) ?? "",
    submissionId,
    submission,
    createdAt: String(row.created_at),
  };
}

function mapFile(row: Record<string, unknown>): ProjectFile {
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    sectionId: row.section_id != null ? Number(row.section_id) : null,
    fileName: row.file_name as string,
    fileUrl: (row.file_url as string) ?? "",
    fileSize: Number(row.file_size ?? 0),
    mimeType: (row.mime_type as string) ?? "",
    uploadedBy: (row.uploaded_by as number | null) ?? null,
    uploaderName: (row.uploader_name as string | undefined) ?? undefined,
    createdAt: String(row.created_at),
  };
}

function mapItem(row: Record<string, unknown>): ProjectItem {
  const productName = row.product_name as string | undefined;
  const productDesc = row.product_description as string | undefined;
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    factoryProductId:
      row.factory_product_id != null ? Number(row.factory_product_id) : null,
    name: productName?.trim() || (row.name as string),
    description: productDesc?.trim() ?? String(row.description ?? ""),
    quantity: Number(row.quantity ?? 1),
    quantityDone: Number(row.quantity_done ?? 0),
    unit: (row.unit as string) ?? "",
    phaseDone: {},
    status: row.status as ProjectItem["status"],
    sortOrder: Number(row.sort_order ?? 0),
    notes: (row.notes as string) ?? "",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listProjectMessages(
  projectId: number,
  limit = 50
): Promise<ProjectMessage[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT m.*, u.name AS user_name,
            s.kind AS submission_kind,
            s.title AS submission_title,
            s.summary AS submission_summary,
            s.detail AS submission_detail,
            s.status AS submission_status,
            s.phase_id AS sub_phase_id,
            s.created_by AS sub_created_by,
            s.reviewed_by AS sub_reviewed_by,
            s.review_note AS sub_review_note,
            s.reviewed_at AS sub_reviewed_at,
            s.created_at AS sub_created_at,
            s.updated_at AS sub_updated_at,
            ph.name AS sub_phase_name,
            cu.name AS sub_creator_name,
            ru.name AS sub_reviewer_name
     FROM project_messages m
     LEFT JOIN erp_users u ON u.id = m.user_id
     LEFT JOIN project_submissions s ON s.id = m.submission_id
     LEFT JOIN project_phases ph ON ph.id = s.phase_id
     LEFT JOIN erp_users cu ON cu.id = s.created_by
     LEFT JOIN erp_users ru ON ru.id = s.reviewed_by
     WHERE m.project_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [projectId, limit]
  );
  return rows.map(mapMessage).reverse();
}

export async function createProjectMessage(
  projectId: number,
  userId: number,
  body: string,
  submissionId?: number | null
): Promise<ProjectMessage> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `INSERT INTO project_messages (project_id, user_id, body, submission_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [projectId, userId, body.trim(), submissionId ?? null]
  );
  if (!row) throw new Error("Không gửi được tin nhắn");
  const withName = await tenantQueryOne<Record<string, unknown>>(
    `SELECT m.*, u.name AS user_name,
            s.kind AS submission_kind,
            s.title AS submission_title,
            s.summary AS submission_summary,
            s.detail AS submission_detail,
            s.status AS submission_status,
            s.phase_id AS sub_phase_id,
            s.created_by AS sub_created_by,
            s.reviewed_by AS sub_reviewed_by,
            s.review_note AS sub_review_note,
            s.reviewed_at AS sub_reviewed_at,
            s.created_at AS sub_created_at,
            s.updated_at AS sub_updated_at,
            ph.name AS sub_phase_name,
            cu.name AS sub_creator_name,
            ru.name AS sub_reviewer_name
     FROM project_messages m
     LEFT JOIN erp_users u ON u.id = m.user_id
     LEFT JOIN project_submissions s ON s.id = m.submission_id
     LEFT JOIN project_phases ph ON ph.id = s.phase_id
     LEFT JOIN erp_users cu ON cu.id = s.created_by
     LEFT JOIN erp_users ru ON ru.id = s.reviewed_by
     WHERE m.id = $1`,
    [row.id]
  );
  return mapMessage(withName ?? row);
}

export async function listProjectFiles(projectId: number): Promise<ProjectFile[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT f.*, u.name AS uploader_name
     FROM project_files f
     LEFT JOIN erp_users u ON u.id = f.uploaded_by
     WHERE f.project_id = $1
     ORDER BY f.created_at DESC`,
    [projectId]
  );
  return rows.map(mapFile);
}

export async function listProjectItems(projectId: number): Promise<ProjectItem[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT * FROM project_items
     WHERE project_id = $1
     ORDER BY sort_order, id`,
    [projectId]
  );
  return rows.map(mapItem);
}

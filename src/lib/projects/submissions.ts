import { tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import type {
  ProjectSubmission,
  ProjectSubmissionKind,
  ProjectSubmissionStatus,
} from "./types";
import { SUBMISSION_KIND_LABELS } from "./constants";
import { createProjectMessage } from "./workspace";

function mapSubmission(row: Record<string, unknown>): ProjectSubmission {
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    phaseId: (row.phase_id as number | null) ?? null,
    phaseName: (row.phase_name as string | undefined) ?? undefined,
    kind: row.kind as ProjectSubmissionKind,
    title: row.title as string,
    summary: (row.summary as string) ?? "",
    detail: (row.detail as string) ?? "",
    status: row.status as ProjectSubmissionStatus,
    createdBy: (row.created_by as number | null) ?? null,
    creatorName: (row.creator_name as string | undefined) ?? undefined,
    reviewedBy: (row.reviewed_by as number | null) ?? null,
    reviewerName: (row.reviewer_name as string | undefined) ?? undefined,
    reviewNote: (row.review_note as string) ?? "",
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const submissionSelect = `
  s.*,
  ph.name AS phase_name,
  cu.name AS creator_name,
  ru.name AS reviewer_name
`;

const submissionFrom = `
  FROM project_submissions s
  LEFT JOIN project_phases ph ON ph.id = s.phase_id
  LEFT JOIN erp_users cu ON cu.id = s.created_by
  LEFT JOIN erp_users ru ON ru.id = s.reviewed_by
`;

export async function listProjectSubmissions(
  projectId: number,
  limit = 40
): Promise<ProjectSubmission[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT ${submissionSelect}
     ${submissionFrom}
     WHERE s.project_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2`,
    [projectId, limit]
  );
  return rows.map(mapSubmission);
}

export async function getProjectSubmission(
  id: number,
  projectId: number
): Promise<ProjectSubmission | null> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT ${submissionSelect}
     ${submissionFrom}
     WHERE s.id = $1 AND s.project_id = $2`,
    [id, projectId]
  );
  return row ? mapSubmission(row) : null;
}

export async function createProjectSubmission(input: {
  projectId: number;
  userId: number;
  kind: ProjectSubmissionKind;
  title: string;
  summary: string;
  detail: string;
  phaseId?: number | null;
  postToChat?: boolean;
}): Promise<{ submission: ProjectSubmission; messageId: number | null }> {
  const title = input.title.trim();
  if (!title) throw new Error("Tiêu đề không được trống");

  const row = await tenantQueryOne<Record<string, unknown>>(
    `INSERT INTO project_submissions
     (project_id, phase_id, kind, title, summary, detail, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.projectId,
      input.phaseId ?? null,
      input.kind,
      title,
      input.summary.trim(),
      input.detail.trim(),
      input.userId,
    ]
  );
  if (!row) throw new Error("Không tạo được phiếu");

  const submission = await getProjectSubmission(row.id as number, input.projectId);
  if (!submission) throw new Error("Không tải được phiếu vừa tạo");

  let messageId: number | null = null;
  if (input.postToChat !== false) {
    const kindLabel = SUBMISSION_KIND_LABELS[input.kind];
    const chatBody = `📋 ${kindLabel}: ${title}`;
    const msg = await createProjectMessage(
      input.projectId,
      input.userId,
      chatBody,
      submission.id
    );
    messageId = msg.id;
  }

  return { submission, messageId };
}

export async function reviewProjectSubmission(
  id: number,
  projectId: number,
  reviewerId: number,
  status: Extract<ProjectSubmissionStatus, "approved" | "rejected">,
  reviewNote: string
): Promise<ProjectSubmission> {
  await tenantQueryOne(
    `UPDATE project_submissions SET
       status = $1,
       reviewed_by = $2,
       review_note = $3,
       reviewed_at = NOW(),
       updated_at = NOW()
     WHERE id = $4 AND project_id = $5`,
    [status, reviewerId, reviewNote.trim(), id, projectId]
  );
  const sub = await getProjectSubmission(id, projectId);
  if (!sub) throw new Error("Không tìm thấy phiếu");
  return sub;
}

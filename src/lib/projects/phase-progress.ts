import { tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import { mirrorProgressPhotosToProjectFiles } from "./project-files";
import { updatePhase } from "./repository";
import type { PhaseProgressLog, PhaseStatus } from "./types";

function mapLog(row: Record<string, unknown>): PhaseProgressLog {
  let photoUrls: string[] = [];
  const raw = row.photo_urls;
  if (Array.isArray(raw)) photoUrls = raw.map(String);
  else if (typeof raw === "string") {
    try {
      photoUrls = JSON.parse(raw);
    } catch {
      photoUrls = [];
    }
  }

  return {
    id: row.id as number,
    projectId: row.project_id as number,
    phaseId: row.phase_id as number,
    userId: (row.user_id as number | null) ?? null,
    userName: (row.user_name as string | undefined) ?? undefined,
    progressPercent: Number(row.progress_percent ?? 0),
    status: row.status as PhaseStatus,
    note: (row.note as string) ?? "",
    photoUrls,
    createdAt: String(row.created_at),
  };
}

export async function recordPhaseProgressUpdate(input: {
  projectId: number;
  phaseId: number;
  phaseName?: string;
  phaseSortOrder?: number;
  userId: number;
  progressPercent: number;
  status: PhaseStatus;
  note?: string;
  photoUrls: string[];
  photoFiles?: Array<{
    url: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
  }>;
  /** Việc nhanh — không bắt buộc ảnh minh chứng */
  photoOptional?: boolean;
}): Promise<PhaseProgressLog> {
  if (!input.photoOptional && !input.photoUrls.length) {
    throw new Error("Phải đính kèm ít nhất một ảnh minh chứng");
  }

  await updatePhase(input.phaseId, {
    status: input.status,
    progressPercent: input.progressPercent,
  });

  await tenantQueryOne(
    `UPDATE project_phases SET
       last_progress_at = NOW(),
       last_progress_by = $1
     WHERE id = $2 AND project_id = $3`,
    [input.userId, input.phaseId, input.projectId]
  );

  const row = await tenantQueryOne<Record<string, unknown>>(
    `INSERT INTO project_phase_progress_logs
     (project_id, phase_id, user_id, progress_percent, status, note, photo_urls)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id`,
    [
      input.projectId,
      input.phaseId,
      input.userId,
      input.progressPercent,
      input.status,
      input.note ?? "",
      JSON.stringify(input.photoUrls),
    ]
  );
  if (!row) throw new Error("Không lưu được lịch sử tiến độ");

  const photosForFiles =
    input.photoFiles?.length
      ? input.photoFiles
      : input.photoUrls.map((url, i) => ({ url }));

  if (photosForFiles.length > 0) {
    const phaseRow = await tenantQueryOne<{ name: string; sort_order: number }>(
      `SELECT name, sort_order FROM project_phases WHERE id = $1 AND project_id = $2`,
      [input.phaseId, input.projectId]
    );
    await mirrorProgressPhotosToProjectFiles({
      projectId: input.projectId,
      phaseName: input.phaseName ?? phaseRow?.name ?? "Công đoạn",
      phaseSortOrder: input.phaseSortOrder ?? Number(phaseRow?.sort_order ?? 0),
      userId: input.userId,
      photos: photosForFiles,
    });
  }

  const full = await tenantQueryOne<Record<string, unknown>>(
    `SELECT l.*, u.name AS user_name
     FROM project_phase_progress_logs l
     LEFT JOIN erp_users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [row.id]
  );
  return mapLog(full ?? row);
}

export async function listPhaseProgressLogs(
  projectId: number,
  phaseId?: number,
  limit = 20
): Promise<PhaseProgressLog[]> {
  const params: unknown[] = [projectId];
  let cond = "l.project_id = $1";
  if (phaseId != null) {
    params.push(phaseId);
    cond += ` AND l.phase_id = $${params.length}`;
  }
  params.push(limit);
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT l.*, u.name AS user_name
     FROM project_phase_progress_logs l
     LEFT JOIN erp_users u ON u.id = l.user_id
     WHERE ${cond}
     ORDER BY l.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.map(mapLog);
}

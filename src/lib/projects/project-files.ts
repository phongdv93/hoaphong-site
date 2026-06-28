import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import { deleteFromS3 } from "@/lib/storage/s3";
import type { ProjectFile, ProjectFileSection } from "./types";

function mapFile(row: Record<string, unknown>): ProjectFile {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    sectionId: row.section_id != null ? Number(row.section_id) : null,
    fileName: String(row.file_name ?? ""),
    fileUrl: String(row.file_url ?? ""),
    fileSize: Number(row.file_size ?? 0),
    mimeType: String(row.mime_type ?? ""),
    uploadedBy: row.uploaded_by != null ? Number(row.uploaded_by) : null,
    uploaderName: row.uploader_name != null ? String(row.uploader_name) : undefined,
    createdAt: String(row.created_at),
  };
}

export async function listProjectFileSections(
  projectId: number
): Promise<ProjectFileSection[]> {
  const sections = await tenantQuery<Record<string, unknown>>(
    `SELECT * FROM project_file_sections
     WHERE project_id = $1
     ORDER BY sort_order, id`,
    [projectId],
    projectId
  );
  const files = await tenantQuery<Record<string, unknown>>(
    `SELECT f.*, u.name AS uploader_name
     FROM project_files f
     LEFT JOIN erp_users u ON u.id = f.uploaded_by
     WHERE f.project_id = $1
     ORDER BY f.created_at`,
    [projectId],
    projectId
  );
  const bySection = new Map<number, ProjectFile[]>();
  const orphan: ProjectFile[] = [];
  for (const row of files) {
    const f = mapFile(row);
    if (f.sectionId != null) {
      const list = bySection.get(f.sectionId) ?? [];
      list.push(f);
      bySection.set(f.sectionId, list);
    } else {
      orphan.push(f);
    }
  }
  const result: ProjectFileSection[] = sections.map((s) => ({
    id: Number(s.id),
    projectId: Number(s.project_id),
    title: String(s.title),
    sortOrder: Number(s.sort_order ?? 0),
    createdAt: String(s.created_at),
    files: bySection.get(Number(s.id)) ?? [],
  }));
  if (orphan.length > 0) {
    result.push({
      id: 0,
      projectId,
      title: "Khác",
      sortOrder: 9999,
      createdAt: orphan[0]!.createdAt,
      files: orphan,
    });
  }
  return result;
}

export async function createProjectFileSection(
  projectId: number,
  title: string
): Promise<number> {
  const max = await tenantQueryOne<{ n: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM project_file_sections WHERE project_id = $1`,
    [projectId],
    projectId
  );
  const sortOrder = Number(max?.n ?? 0);
  const row = await tenantQueryOne<{ id: number }>(
    `INSERT INTO project_file_sections (project_id, title, sort_order)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [projectId, title.trim(), sortOrder],
    projectId
  );
  return Number(row!.id);
}

export async function updateProjectFileSection(
  sectionId: number,
  projectId: number,
  title: string
): Promise<void> {
  await tenantExecute(
    `UPDATE project_file_sections SET title = $1 WHERE id = $2 AND project_id = $3`,
    [title.trim(), sectionId, projectId],
    projectId
  );
}

export async function deleteProjectFileSection(
  sectionId: number,
  projectId: number
): Promise<void> {
  const files = await tenantQuery<{ file_url: string }>(
    `SELECT file_url FROM project_files WHERE section_id = $1 AND project_id = $2`,
    [sectionId, projectId],
    projectId
  );
  for (const f of files) {
    try {
      await deleteFromS3(f.file_url);
    } catch {
      // continue
    }
  }
  await tenantExecute(
    `DELETE FROM project_files WHERE section_id = $1 AND project_id = $2`,
    [sectionId, projectId],
    projectId
  );
  await tenantExecute(
    `DELETE FROM project_file_sections WHERE id = $1 AND project_id = $2`,
    [sectionId, projectId],
    projectId
  );
}

export async function createProjectFileRecord(input: {
  projectId: number;
  sectionId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
}): Promise<number> {
  const row = await tenantQueryOne<{ id: number }>(
    `INSERT INTO project_files
       (project_id, section_id, file_name, file_url, file_size, mime_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.projectId,
      input.sectionId,
      input.fileName,
      input.fileUrl,
      input.fileSize,
      input.mimeType,
      input.uploadedBy,
    ],
    input.projectId
  );
  return Number(row!.id);
}

export async function deleteProjectFileRecord(
  fileId: number,
  projectId: number
): Promise<void> {
  const row = await tenantQueryOne<{ file_url: string }>(
    `SELECT file_url FROM project_files WHERE id = $1 AND project_id = $2`,
    [fileId, projectId],
    projectId
  );
  if (row?.file_url) {
    try {
      await deleteFromS3(row.file_url);
    } catch {
      // continue
    }
  }
  await tenantExecute(
    `DELETE FROM project_files WHERE id = $1 AND project_id = $2`,
    [fileId, projectId],
    projectId
  );
}

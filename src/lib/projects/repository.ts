import { findCatalogProductByName } from "@/lib/factory/products";
import { toLocalDateString, toIsoDateTime } from "@/lib/dates";
import { defaultProjectScheduleDates } from "./project-timeline";
import { syncPhasesProgressFromItems } from "./phase-items-progress";
import { syncTenantUser, syncTenantUsers } from "@/lib/db/sync-tenant-user";
import { tenantExecute, tenantQuery, tenantQueryOne, tenantWithTransaction, getTenantPool } from "@/lib/db/tenant";
import { requireTenantCompanyIdFromContext } from "@/lib/db/tenant-context";
import {
  isPgUniqueViolation,
  repairTenantSerialSequences,
} from "@/lib/db/repair-sequences";
import type {
  PhaseKind,
  PhaseStatus,
  Project,
  ProjectMember,
  ProjectMemberRole,
  ProjectPhase,
  ProjectItem,
  ProjectStatus,
  ProjectGanttPhase,
  ProjectSummary,
  ProjectTemplate,
} from "./types";
import { DEFAULT_PHASES } from "./constants";
import { normalizeProjectTemplate } from "./project-templates";

// ============ MAPPERS ============

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as number,
    companyId: row.company_id as number,
    code: row.code as string,
    name: row.name as string,
    customerId: (row.customer_id as number | null) ?? null,
    customerName: (row.customer_name as string | undefined) ?? undefined,
    contractValue: Number(row.contract_value ?? 0),
    contractSignedAt: row.contract_signed_at ? toIsoDate(row.contract_signed_at) : null,
    status: row.status as ProjectStatus,
    startDate: row.start_date ? toIsoDate(row.start_date) : null,
    expectedEndDate: row.expected_end_date ? toIsoDate(row.expected_end_date) : null,
    actualEndDate: row.actual_end_date ? toIsoDate(row.actual_end_date) : null,
    address: (row.address as string) ?? "",
    notes: (row.notes as string) ?? "",
    supplierAddress: (row.supplier_address as string) ?? "",
    exportCountry: (row.export_country as string) ?? "",
    completedLateDays: Number(row.completed_late_days ?? 0),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    managerUserId: (row.manager_user_id as number | null) ?? null,
    managerName: (row.manager_name as string | undefined) ?? undefined,
    template: normalizeProjectTemplate(row.template as string | undefined),
    createdBy: (row.created_by as number | null) ?? null,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  };
}

function mapPhase(row: Record<string, unknown>): ProjectPhase {
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    kind: row.kind as PhaseKind,
    name: row.name as string,
    sortOrder: Number(row.sort_order ?? 0),
    deadlineAt: row.deadline_at ? toIsoDate(row.deadline_at) : null,
    startedAt: row.started_at ? toIsoDate(row.started_at) : null,
    completedAt: row.completed_at ? toIsoDate(row.completed_at) : null,
    status: row.status as PhaseStatus,
    assigneeUserId: (row.assignee_user_id as number | null) ?? null,
    assigneeName: (row.assignee_name as string | undefined) ?? undefined,
    progressPercent: Number(row.progress_percent ?? 0),
    notes: (row.notes as string) ?? "",
    lastProgressAt: row.last_progress_at ? String(row.last_progress_at) : null,
    lastProgressBy: (row.last_progress_by as number | null) ?? null,
    lastProgressByName: (row.last_progress_by_name as string | undefined) ?? undefined,
    progressFromItems: Boolean(row.progress_from_items),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapMember(row: Record<string, unknown>): ProjectMember {
  return {
    projectId: row.project_id as number,
    userId: row.user_id as number,
    userName: (row.user_name as string | undefined) ?? undefined,
    userEmail: (row.user_email as string | undefined) ?? undefined,
    role: row.role as ProjectMemberRole,
    joinedAt: String(row.joined_at),
  };
}

function toIsoDate(value: unknown): string {
  return toLocalDateString(value) ?? "";
}

// ============ PROJECTS ============

export async function listProjects(
  companyId: number,
  filter?: { status?: ProjectStatus; q?: string; memberUserId?: number }
): Promise<ProjectSummary[]> {
  const conds: string[] = [
    `p.company_id = $1`,
    `(p.deleted_at IS NULL)`,
  ];
  const params: unknown[] = [companyId];
  if (filter?.status) {
    params.push(filter.status);
    conds.push(`p.status = $${params.length}`);
  }
  if (filter?.q?.trim()) {
    params.push(`%${filter.q.trim()}%`);
    conds.push(`(p.name ILIKE $${params.length} OR p.code ILIKE $${params.length})`);
  }
  if (filter?.memberUserId != null) {
    params.push(filter.memberUserId);
    conds.push(
      `EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $${params.length})`
    );
  }
  const where = `WHERE ${conds.join(" AND ")}`;
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT p.*,
            c.name AS customer_name,
            u.name AS manager_name,
            (SELECT COUNT(*) FROM project_phases ph WHERE ph.project_id = p.id) AS phase_count,
            (SELECT COUNT(*) FROM project_phases ph WHERE ph.project_id = p.id AND ph.status = 'done') AS phase_done_count,
            (SELECT COUNT(*) FROM project_phases ph
             WHERE ph.project_id = p.id
               AND (
                 ph.status = 'delayed'
                 OR (ph.deadline_at < CURRENT_DATE AND ph.status NOT IN ('done'))
               )) AS phase_delayed_count,
            (SELECT COUNT(*) FROM project_members m WHERE m.project_id = p.id) AS member_count,
            COALESCE(
              (SELECT json_agg(
                json_build_object(
                  'id', ph.id,
                  'name', ph.name,
                  'status', ph.status,
                  'deadlineAt', ph.deadline_at,
                  'startedAt', ph.started_at,
                  'sortOrder', ph.sort_order,
                  'progressPercent', ph.progress_percent
                ) ORDER BY ph.sort_order, ph.id
              )
              FROM project_phases ph WHERE ph.project_id = p.id),
              '[]'::json
            ) AS phases_json
     FROM projects p
     LEFT JOIN customers c ON c.id = p.customer_id
     LEFT JOIN erp_users u ON u.id = p.manager_user_id
     ${where}
     ORDER BY p.created_at DESC`,
    params,
    companyId
  );
  return rows.map((r) => ({
    ...mapProject(r),
    phaseCount: Number(r.phase_count ?? 0),
    phaseDoneCount: Number(r.phase_done_count ?? 0),
    phaseDelayedCount: Number(r.phase_delayed_count ?? 0),
    memberCount: Number(r.member_count ?? 0),
    phases: mapGanttPhases(r.phases_json),
  }));
}

/** Dự án đã xóa mềm — không hiển thị trên Gantt. */
export async function listDeletedProjects(
  companyId: number,
  filter?: { q?: string; memberUserId?: number }
): Promise<ProjectSummary[]> {
  const conds: string[] = [`p.company_id = $1`, `p.deleted_at IS NOT NULL`];
  const params: unknown[] = [companyId];
  if (filter?.q?.trim()) {
    params.push(`%${filter.q.trim()}%`);
    conds.push(`(p.name ILIKE $${params.length} OR p.code ILIKE $${params.length})`);
  }
  if (filter?.memberUserId != null) {
    params.push(filter.memberUserId);
    conds.push(
      `EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $${params.length})`
    );
  }
  const where = `WHERE ${conds.join(" AND ")}`;
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT p.*,
            c.name AS customer_name,
            u.name AS manager_name,
            0::int AS phase_count,
            0::int AS phase_done_count,
            0::int AS phase_delayed_count,
            (SELECT COUNT(*) FROM project_members m WHERE m.project_id = p.id) AS member_count,
            '[]'::json AS phases_json
     FROM projects p
     LEFT JOIN customers c ON c.id = p.customer_id
     LEFT JOIN erp_users u ON u.id = p.manager_user_id
     ${where}
     ORDER BY p.deleted_at DESC NULLS LAST, p.updated_at DESC`,
    params,
    companyId
  );
  return rows.map((r) => ({
    ...mapProject(r),
    phaseCount: 0,
    phaseDoneCount: 0,
    phaseDelayedCount: 0,
    memberCount: Number(r.member_count ?? 0),
    phases: [],
  }));
}

export type PiSourceProject = {
  id: number;
  code: string;
  name: string;
  customerId: number | null;
  customerName: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  address: string;
  itemCount: number;
};

/** Dự án có thể chọn làm mẫu PI / đơn hàng khi tạo dự án mới. */
export async function listPiSourceProjects(
  companyId: number,
  memberUserId?: number
): Promise<PiSourceProject[]> {
  const conds = [`p.company_id = $1`, `p.deleted_at IS NULL`];
  const params: unknown[] = [companyId];
  if (memberUserId != null) {
    params.push(memberUserId);
    conds.push(
      `EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $${params.length})`
    );
  }
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT p.id, p.code, p.name, p.customer_id, c.name AS customer_name,
            p.start_date, p.expected_end_date, p.address,
            (SELECT COUNT(*)::int FROM project_items i WHERE i.project_id = p.id) AS item_count
     FROM projects p
     LEFT JOIN customers c ON c.id = p.customer_id
     WHERE ${conds.join(" AND ")}
     ORDER BY p.updated_at DESC
     LIMIT 100`,
    params,
    companyId
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ""),
    name: String(r.name ?? ""),
    customerId: r.customer_id != null ? Number(r.customer_id) : null,
    customerName: r.customer_name != null ? String(r.customer_name) : null,
    startDate: r.start_date != null ? String(r.start_date).slice(0, 10) : null,
    expectedEndDate:
      r.expected_end_date != null ? String(r.expected_end_date).slice(0, 10) : null,
    address: String(r.address ?? ""),
    itemCount: Number(r.item_count ?? 0),
  }));
}

function mapGanttPhases(raw: unknown): ProjectGanttPhase[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((ph: Record<string, unknown>) => ({
    id: Number(ph.id),
    name: String(ph.name ?? ""),
    status: ph.status as PhaseStatus,
    deadlineAt:
      toLocalDateString(ph.deadlineAt ?? ph.deadline_at) ?? null,
    startedAt:
      toLocalDateString(ph.startedAt ?? ph.started_at) ?? null,
    sortOrder: Number(ph.sortOrder ?? ph.sort_order ?? 0),
    progressPercent: Number(ph.progressPercent ?? ph.progress_percent ?? 0),
  }));
}

/** Lấy project — chỉ trả nếu thuộc đúng companyId (chống truy cập chéo công ty). */
export async function getProject(id: number, companyId?: number): Promise<Project | null> {
  const params: unknown[] = [id];
  let where = "p.id = $1";
  if (companyId !== undefined) {
    params.push(companyId);
    where += ` AND p.company_id = $${params.length}`;
  }
  const row = await tenantQueryOne<Record<string, unknown>>(
    `SELECT p.*, c.name AS customer_name, u.name AS manager_name
     FROM projects p
     LEFT JOIN customers c ON c.id = p.customer_id
     LEFT JOIN erp_users u ON u.id = p.manager_user_id
     WHERE ${where}`,
    params,
    companyId
  );
  return row ? mapProject(row) : null;
}

export async function createProject(input: {
  companyId: number;
  code?: string;
  name: string;
  customerId?: number | null;
  contractValue?: number;
  contractSignedAt?: string | null;
  status?: ProjectStatus;
  startDate?: string | null;
  expectedEndDate?: string | null;
  address?: string;
  notes?: string;
  supplierAddress?: string;
  exportCountry?: string;
  managerUserId?: number | null;
  createdBy: number;
  template?: ProjectTemplate;
  /** Tự sinh 7 công đoạn mặc định nếu true (mặc định bật) */
  seedPhases?: boolean;
}): Promise<number> {
  return tenantWithTransaction(async (client) => {
    const code = input.code?.trim();
    if (!code) throw new Error("Mã dự án (PI / hợp đồng) bắt buộc");
    const scheduleDefaults = defaultProjectScheduleDates();
    const startDate = input.startDate?.trim() || scheduleDefaults.startDate;
    const expectedEndDate =
      input.expectedEndDate?.trim() || scheduleDefaults.expectedEndDate;
    const template = normalizeProjectTemplate(input.template);
    const seedPhases = input.seedPhases ?? template !== "task";
    const res = await client.query<{ id: number }>(
      `INSERT INTO projects
       (company_id, code, name, customer_id, contract_value, contract_signed_at, status,
        start_date, expected_end_date, address, notes, supplier_address, export_country,
        manager_user_id, created_by, template)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        input.companyId,
        code,
        input.name.trim(),
        input.customerId ?? null,
        input.contractValue ?? 0,
        input.contractSignedAt || null,
        input.status || "open",
        startDate,
        expectedEndDate,
        input.address || "",
        input.notes || "",
        input.supplierAddress || "",
        input.exportCountry || "",
        input.managerUserId ?? null,
        input.createdBy,
        template,
      ]
    );
    const projectId = res.rows[0].id;

    // Thành viên mặc định: người tạo = owner
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [projectId, input.createdBy]
    );
    if (input.managerUserId && input.managerUserId !== input.createdBy) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'manager')
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'manager'`,
        [projectId, input.managerUserId]
      );
    }

    if (input.seedPhases !== false && seedPhases) {
      for (let i = 0; i < DEFAULT_PHASES.length; i++) {
        const p = DEFAULT_PHASES[i];
        await client.query(
          `INSERT INTO project_phases (project_id, kind, name, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [projectId, p.kind, p.name, (i + 1) * 10]
        );
      }
    } else if (template === "task") {
      await client.query(
        `INSERT INTO project_phases (project_id, kind, name, sort_order)
         VALUES ($1, 'production', 'Thực hiện', 10)`,
        [projectId]
      );
    }
    return projectId;
  }, input.companyId).then(async (projectId) => {
    const userIds = [input.createdBy, input.managerUserId].filter(
      (id): id is number => id != null && Number.isFinite(id)
    );
    await syncTenantUsers(input.companyId, userIds);
    return projectId;
  });
}

export async function updateProject(
  id: number,
  companyId: number,
  input: Partial<Omit<Project, "id" | "companyId" | "createdAt" | "updatedAt" | "createdBy">>
): Promise<void> {
  const cur = await getProject(id, companyId);
  if (!cur) throw new Error("Không tìm thấy dự án");

  const nextStatus = input.status ?? cur.status;
  let completedLateDays =
    input.completedLateDays === undefined
      ? cur.completedLateDays
      : input.completedLateDays;
  const expectedEnd = input.expectedEndDate === undefined ? cur.expectedEndDate : input.expectedEndDate;
  let actualEnd = input.actualEndDate === undefined ? cur.actualEndDate : input.actualEndDate;
  if (nextStatus === "done" && !actualEnd) {
    actualEnd = new Date().toISOString().slice(0, 10);
  }
  if (nextStatus === "done" && expectedEnd && actualEnd && expectedEnd < actualEnd) {
    completedLateDays = daysBetweenIso(expectedEnd, actualEnd);
  }

  await tenantExecute(
    `UPDATE projects SET
       code=$1, name=$2, customer_id=$3, contract_value=$4, contract_signed_at=$5,
       status=$6, start_date=$7, expected_end_date=$8, actual_end_date=$9,
       address=$10, notes=$11, supplier_address=$12, export_country=$13,
       completed_late_days=$14, manager_user_id=$15, template=$16, updated_at=NOW()
     WHERE id=$17 AND company_id=$18`,
    [
      input.code ?? cur.code,
      input.name ?? cur.name,
      input.customerId === undefined ? cur.customerId : input.customerId,
      input.contractValue ?? cur.contractValue,
      input.contractSignedAt === undefined ? cur.contractSignedAt : input.contractSignedAt,
      nextStatus,
      input.startDate === undefined ? cur.startDate : input.startDate,
      expectedEnd,
      actualEnd,
      input.address ?? cur.address,
      input.notes ?? cur.notes,
      input.supplierAddress ?? cur.supplierAddress,
      input.exportCountry ?? cur.exportCountry,
      completedLateDays,
      input.managerUserId === undefined ? cur.managerUserId : input.managerUserId,
      input.template === undefined ? cur.template : normalizeProjectTemplate(input.template),
      id,
      companyId,
    ],
    companyId
  );
}

function daysBetweenIso(a: string, b: string): number {
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/** Xóa mềm — chuyển vào danh mục đã xóa, không còn trên timeline. */
export async function softDeleteProject(id: number, companyId: number): Promise<void> {
  await tenantExecute(
    `UPDATE projects SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
}

export async function restoreProject(id: number, companyId: number): Promise<void> {
  await tenantExecute(
    `UPDATE projects SET deleted_at = NULL, updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
}

export async function deleteProject(id: number, companyId: number): Promise<void> {
  await softDeleteProject(id, companyId);
}

/** Xóa vĩnh viễn — chỉ dự án đã nằm trong thùng rác. */
export async function purgeProject(id: number, companyId: number): Promise<void> {
  const row = await tenantQueryOne<{ deleted_at: string | null }>(
    `SELECT deleted_at FROM projects WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
  if (!row) throw new Error("Không tìm thấy dự án");
  if (!row.deleted_at) throw new Error("Chỉ xóa vĩnh viễn được dự án đã xóa mềm trước đó");
  await tenantExecute(
    `DELETE FROM projects WHERE id = $1 AND company_id = $2`,
    [id, companyId],
    companyId
  );
}

// ============ PHASES ============

export async function listPhases(projectId: number): Promise<ProjectPhase[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT ph.*, u.name AS assignee_name, lp.name AS last_progress_by_name
     FROM project_phases ph
     LEFT JOIN erp_users u ON u.id = ph.assignee_user_id
     LEFT JOIN erp_users lp ON lp.id = ph.last_progress_by
     WHERE ph.project_id = $1
     ORDER BY ph.sort_order, ph.id`,
    [projectId]
  );
  return rows.map(mapPhase);
}

/** Việc nhanh cũ có thể chưa có công đoạn — tự thêm một công đoạn mặc định. */
export async function ensureTaskDefaultPhase(projectId: number): Promise<void> {
  const row = await tenantQueryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM project_phases WHERE project_id = $1`,
    [projectId]
  );
  if (Number(row?.n ?? 0) > 0) return;
  await tenantExecute(
    `INSERT INTO project_phases (project_id, kind, name, sort_order)
     VALUES ($1, 'production', 'Thực hiện', 10)`,
    [projectId]
  );
}

function validatePhaseScheduleAgainstProject(
  projectStart: string | null,
  projectEnd: string | null,
  startedAt: string | null,
  deadlineAt: string | null
): void {
  if (startedAt && deadlineAt && deadlineAt < startedAt) {
    throw new Error("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
  }
  if (projectEnd && deadlineAt && deadlineAt > projectEnd) {
    throw new Error(`Ngày kết thúc không được sau hạn dự án (${projectEnd})`);
  }
  if (projectEnd && startedAt && startedAt > projectEnd) {
    throw new Error(`Ngày bắt đầu không được sau hạn dự án (${projectEnd})`);
  }
  if (projectStart && startedAt && startedAt < projectStart) {
    throw new Error(`Ngày bắt đầu không được trước ngày khởi công dự án (${projectStart})`);
  }
}

/** Khi hoàn thành/trễ hạn — không gán startedAt = hôm nay nếu đã qua deadline công đoạn. */
function inferStartedAtForProgress(
  newStatus: PhaseStatus,
  prevStartedAt: string | null,
  deadlineAt: string | null,
  now: string
): string | null {
  if (prevStartedAt) return prevStartedAt;
  if (newStatus !== "in_progress" && newStatus !== "done") return null;
  if (deadlineAt && deadlineAt < now) return deadlineAt;
  return now;
}

export async function createPhase(input: {
  projectId: number;
  kind: PhaseKind;
  name: string;
  sortOrder?: number;
  startedAt?: string | null;
  deadlineAt?: string | null;
  assigneeUserId?: number | null;
  notes?: string;
}): Promise<number> {
  const projectRow = await tenantQueryOne<Record<string, unknown>>(
    `SELECT start_date, expected_end_date FROM projects WHERE id = $1`,
    [input.projectId]
  );
  const projectStart = projectRow?.start_date
    ? toIsoDate(projectRow.start_date)
    : null;
  const projectEnd = projectRow?.expected_end_date
    ? toIsoDate(projectRow.expected_end_date)
    : null;

  const startedAt = input.startedAt || null;
  const deadlineAt = input.deadlineAt || null;
  validatePhaseScheduleAgainstProject(projectStart, projectEnd, startedAt, deadlineAt);

  const order =
    input.sortOrder ??
    (await tenantQueryOne<{ next: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM project_phases WHERE project_id = $1`,
      [input.projectId]
    ))?.next ??
    10;
  const params = [
    input.projectId,
    input.kind,
    input.name.trim(),
    order,
    input.startedAt || null,
    input.deadlineAt || null,
    input.assigneeUserId ?? null,
    input.notes || "",
  ];

  const insert = () =>
    tenantQueryOne<{ id: number }>(
      `INSERT INTO project_phases
       (project_id, kind, name, sort_order, started_at, deadline_at, assignee_user_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      params
    );

  try {
    const row = await insert();
    return row!.id;
  } catch (err) {
    if (!isPgUniqueViolation(err)) throw err;
    const companyId = requireTenantCompanyIdFromContext();
    await repairTenantSerialSequences(await getTenantPool(companyId));
    const row = await insert();
    return row!.id;
  }
}

export async function updatePhase(
  id: number,
  input: Partial<Omit<ProjectPhase, "id" | "projectId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const cur = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM project_phases WHERE id = $1`,
    [id]
  );
  if (!cur) throw new Error("Không tìm thấy công đoạn");
  const prev = mapPhase(cur);

  const projectRow = await tenantQueryOne<Record<string, unknown>>(
    `SELECT start_date, expected_end_date FROM projects WHERE id = $1`,
    [prev.projectId]
  );
  const projectStart = projectRow?.start_date
    ? toIsoDate(projectRow.start_date)
    : null;
  const projectEnd = projectRow?.expected_end_date
    ? toIsoDate(projectRow.expected_end_date)
    : null;

  const now = new Date().toISOString().slice(0, 10);
  const newStatus = input.status ?? prev.status;
  let startedAt = input.startedAt === undefined ? prev.startedAt : input.startedAt;
  const deadlineAt = input.deadlineAt === undefined ? prev.deadlineAt : input.deadlineAt;
  let completedAt = input.completedAt === undefined ? prev.completedAt : input.completedAt;

  validatePhaseScheduleAgainstProject(
    projectStart,
    projectEnd,
    startedAt,
    deadlineAt
  );

  if (newStatus === "in_progress" && !startedAt) {
    startedAt = inferStartedAtForProgress(newStatus, prev.startedAt, deadlineAt, now);
  }
  if (newStatus === "done" && !completedAt) completedAt = now;
  if (newStatus === "done" && !startedAt) {
    startedAt = inferStartedAtForProgress(newStatus, prev.startedAt, deadlineAt, now);
  }

  const progressFromItems =
    input.progressFromItems === undefined ? prev.progressFromItems : input.progressFromItems;

  await tenantExecute(
    `UPDATE project_phases SET
       kind=$1, name=$2, sort_order=$3, deadline_at=$4, started_at=$5,
       completed_at=$6, status=$7, assignee_user_id=$8, progress_percent=$9,
       notes=$10, progress_from_items=$11, updated_at=NOW()
     WHERE id=$12`,
    [
      input.kind ?? prev.kind,
      input.name ?? prev.name,
      input.sortOrder ?? prev.sortOrder,
      deadlineAt,
      startedAt,
      completedAt,
      newStatus,
      input.assigneeUserId === undefined ? prev.assigneeUserId : input.assigneeUserId,
      input.progressPercent ?? prev.progressPercent,
      input.notes ?? prev.notes,
      progressFromItems,
      id,
    ]
  );

  if (progressFromItems) {
    await syncPhasesProgressFromItems(prev.projectId);
  }
}

export async function deletePhase(id: number): Promise<void> {
  await tenantExecute("DELETE FROM project_phases WHERE id = $1", [id]);
}

// ============ PROJECT ITEMS (hạng mục) ============

function mapProjectItem(
  row: Record<string, unknown>,
  phaseDone: Record<number, number> = {}
): ProjectItem {
  const productName = row.product_name as string | undefined;
  const productDesc = row.product_description as string | undefined;
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    factoryProductId:
      row.factory_product_id != null ? Number(row.factory_product_id) : null,
    name: productName?.trim() || (row.name as string),
    description: productDesc?.trim() ?? String(row.description ?? ""),
    quantity: Number(row.quantity),
    quantityDone: Number(row.quantity_done ?? 0),
    unit: (row.unit as string) ?? "",
    phaseDone,
    status: row.status as ProjectItem["status"],
    sortOrder: row.sort_order as number,
    notes: (row.notes as string) ?? "",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listProjectItems(projectId: number): Promise<ProjectItem[]> {
  const [rows, phaseDoneMap] = await Promise.all([
    tenantQuery<Record<string, unknown>>(
      `SELECT i.*,
              p.name AS product_name,
              p.description AS product_description
       FROM project_items i
       LEFT JOIN factory_products p ON p.id = i.factory_product_id
       WHERE i.project_id = $1
       ORDER BY i.sort_order, i.id`,
      [projectId]
    ),
    loadPhaseDoneByProject(projectId),
  ]);

  return rows.map((r) => mapProjectItem(r, phaseDoneMap.get(r.id as number) ?? {}));
}

async function loadPhaseDoneByProject(projectId: number): Promise<Map<number, Record<number, number>>> {
  const rows = await tenantQuery<{
    item_id: number;
    phase_id: number;
    quantity_done: number;
  }>(
    `SELECT pp.item_id, pp.phase_id, pp.quantity_done
     FROM project_item_phase_progress pp
     JOIN project_items i ON i.id = pp.item_id
     WHERE i.project_id = $1`,
    [projectId]
  );
  const map = new Map<number, Record<number, number>>();
  for (const r of rows) {
    const itemId = r.item_id;
    if (!map.has(itemId)) map.set(itemId, {});
    map.get(itemId)![r.phase_id] = Number(r.quantity_done ?? 0);
  }
  return map;
}

export async function upsertItemPhaseProgress(
  itemId: number,
  phaseId: number,
  quantityDone: number
): Promise<void> {
  const item = await tenantQueryOne<{ project_id: number }>(
    `SELECT project_id FROM project_items WHERE id = $1`,
    [itemId]
  );
  if (!item) throw new Error("Không tìm thấy hạng mục");

  const phase = await tenantQueryOne<{ project_id: number; progress_from_items: boolean }>(
    `SELECT project_id, progress_from_items FROM project_phases WHERE id = $1`,
    [phaseId]
  );
  if (!phase || phase.project_id !== item.project_id) {
    throw new Error("Công đoạn không thuộc dự án này");
  }
  if (!phase.progress_from_items) {
    throw new Error("Công đoạn chưa bật theo dõi theo hạng mục");
  }

  const done = Math.max(0, Number(quantityDone) || 0);
  await tenantExecute(
    `INSERT INTO project_item_phase_progress (item_id, phase_id, quantity_done, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (item_id, phase_id)
     DO UPDATE SET quantity_done = EXCLUDED.quantity_done, updated_at = NOW()`,
    [itemId, phaseId, done]
  );
  await syncPhasesProgressFromItems(item.project_id);
}

export async function createProjectItem(input: {
  projectId: number;
  factoryProductId: number;
  sortOrder?: number;
  quantity?: number;
  quantityDone?: number;
  unit?: string;
}): Promise<number> {
  const product = await tenantQueryOne<{ name: string; description: string }>(
    `SELECT name, description FROM factory_products WHERE id = $1`,
    [input.factoryProductId]
  );
  if (!product) {
    throw new Error("Sản phẩm không có trong danh mục — lưu từ báo giá trước");
  }

  const order =
    input.sortOrder ??
    (await tenantQueryOne<{ next: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM project_items WHERE project_id = $1`,
      [input.projectId]
    ))?.next ??
    10;

  await tenantExecute(
    `UPDATE factory_products
     SET source_project_id = COALESCE(source_project_id, $1), updated_at = NOW()
     WHERE id = $2`,
    [input.projectId, input.factoryProductId]
  );

  const params = [
    input.projectId,
    product.name.trim(),
    product.description?.trim() ?? "",
    input.quantity ?? 1,
    input.quantityDone ?? 0,
    input.unit ?? "",
    input.factoryProductId,
    order,
  ];
  const insert = () =>
    tenantQueryOne<{ id: number }>(
      `INSERT INTO project_items (
         project_id, name, description, quantity, quantity_done, unit,
         factory_product_id, sort_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      params
    );
  try {
    const row = await insert();
    await syncPhasesProgressFromItems(input.projectId);
    return row!.id;
  } catch (err) {
    if (!isPgUniqueViolation(err)) throw err;
    const companyId = requireTenantCompanyIdFromContext();
    await repairTenantSerialSequences(await getTenantPool(companyId));
    const row = await insert();
    await syncPhasesProgressFromItems(input.projectId);
    return row!.id;
  }
}

/** Dán nhiều hàng — chỉ thêm SP đã có trong danh mục (khớp tên). */
export async function createProjectItemsFromCatalogNames(input: {
  projectId: number;
  rows: Array<{ name: string; description?: string; quantity?: number; unit?: string }>;
  baseSortOrder?: number;
}): Promise<{ added: number; skipped: string[] }> {
  let added = 0;
  const skipped: string[] = [];
  const base = input.baseSortOrder ?? 0;

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    const productId = await findCatalogProductByName(r.name);
    if (!productId) {
      skipped.push(r.name);
      continue;
    }
    await createProjectItem({
      projectId: input.projectId,
      factoryProductId: productId,
      quantity: r.quantity ?? 1,
      unit: r.unit,
      sortOrder: base + i,
    });
    added++;
  }

  return { added, skipped };
}

/** Thêm hạng mục trực tiếp (không bắt buộc có trong danh mục SP). */
export async function createProjectItemsFromRows(input: {
  projectId: number;
  rows: Array<{ name: string; description?: string; quantity?: number; unit?: string }>;
  baseSortOrder?: number;
}): Promise<number> {
  let added = 0;
  const startOrder =
    input.baseSortOrder ??
    (await tenantQueryOne<{ next: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM project_items WHERE project_id = $1`,
      [input.projectId]
    ))?.next ??
    10;

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    const name = r.name?.trim();
    if (!name) continue;
    await tenantExecute(
      `INSERT INTO project_items (
         project_id, name, description, quantity, unit, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.projectId,
        name,
        r.description?.trim() ?? "",
        r.quantity ?? 1,
        r.unit?.trim() ?? "",
        startOrder + i * 10,
      ]
    );
    added++;
  }
  await syncPhasesProgressFromItems(input.projectId);
  return added;
}

export async function updateProjectItem(
  id: number,
  input: Partial<
    Pick<
      ProjectItem,
      "name" | "description" | "quantity" | "quantityDone" | "unit" | "status" | "notes"
    >
  > & { phaseProgress?: { phaseId: number; quantityDone: number } }
): Promise<void> {
  const cur = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM project_items WHERE id = $1`,
    [id]
  );
  if (!cur) throw new Error("Không tìm thấy hạng mục");

  if (input.phaseProgress) {
    await upsertItemPhaseProgress(
      id,
      input.phaseProgress.phaseId,
      input.phaseProgress.quantityDone
    );
    return;
  }

  const nextName = input.name ?? String(cur.name);
  const nextDesc = input.description ?? String(cur.description ?? "");
  const productId =
    cur.factory_product_id != null ? Number(cur.factory_product_id) : null;

  await tenantExecute(
    `UPDATE project_items SET
       name = $1, description = $2, quantity = $3, quantity_done = $4, unit = $5,
       factory_product_id = $6, status = $7, notes = $8, updated_at = NOW()
     WHERE id = $9`,
    [
      nextName,
      nextDesc,
      input.quantity ?? Number(cur.quantity),
      input.quantityDone ?? Number(cur.quantity_done ?? 0),
      input.unit ?? String(cur.unit ?? ""),
      productId,
      input.status ?? String(cur.status),
      input.notes ?? String(cur.notes ?? ""),
      id,
    ]
  );
  await syncPhasesProgressFromItems(Number(cur.project_id));
}

export async function deleteProjectItem(id: number): Promise<void> {
  const cur = await tenantQueryOne<{ project_id: number }>(
    `SELECT project_id FROM project_items WHERE id = $1`,
    [id]
  );
  await tenantExecute("DELETE FROM project_items WHERE id = $1", [id]);
  if (cur) await syncPhasesProgressFromItems(cur.project_id);
}

export async function deleteAllProjectItems(projectId: number): Promise<number> {
  const res = await tenantExecute(
    "DELETE FROM project_items WHERE project_id = $1",
    [projectId]
  );
  await syncPhasesProgressFromItems(projectId);
  return res.rowCount;
}

/** Sao chép hạng mục từ dự án PI / đơn hàng có sẵn sang dự án mới. */
export async function copyProjectItemsFromProject(
  targetProjectId: number,
  sourceProjectId: number
): Promise<number> {
  if (targetProjectId === sourceProjectId) return 0;

  const pair = await tenantQueryOne<{ sc: number; tc: number }>(
    `SELECT
       (SELECT company_id FROM projects WHERE id = $1) AS sc,
       (SELECT company_id FROM projects WHERE id = $2) AS tc`,
    [sourceProjectId, targetProjectId]
  );
  if (!pair?.sc || !pair?.tc || pair.sc !== pair.tc) {
    throw new Error("Dự án nguồn không hợp lệ");
  }

  const res = await tenantExecute(
    `INSERT INTO project_items (
       project_id, name, description, quantity, quantity_done, unit,
       factory_product_id, sort_order, status, notes
     )
     SELECT $1, name, description, quantity, 0, unit,
            factory_product_id, sort_order, status, notes
     FROM project_items
     WHERE project_id = $2`,
    [targetProjectId, sourceProjectId]
  );
  await syncPhasesProgressFromItems(targetProjectId);
  return res.rowCount;
}

// ============ MEMBERS ============

export async function listMembers(projectId: number): Promise<ProjectMember[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT m.*, u.name AS user_name, u.email AS user_email
     FROM project_members m
     JOIN erp_users u ON u.id = m.user_id
     WHERE m.project_id = $1
     ORDER BY
       CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'member' THEN 2 ELSE 3 END,
       u.name`,
    [projectId]
  );
  return rows.map(mapMember);
}

export async function upsertMember(
  projectId: number,
  userId: number,
  role: ProjectMemberRole,
  companyId: number
): Promise<void> {
  await tenantExecute(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [projectId, userId, role],
    companyId
  );
  await syncTenantUser(companyId, userId);
}

export async function removeMember(projectId: number, userId: number): Promise<void> {
  await tenantExecute(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [
    projectId,
    userId,
  ]);
}

export async function getMemberRole(
  projectId: number,
  userId: number
): Promise<ProjectMemberRole | null> {
  const row = await tenantQueryOne<{ role: ProjectMemberRole }>(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return row?.role ?? null;
}

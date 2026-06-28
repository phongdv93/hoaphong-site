import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import { toIsoDateTime } from "@/lib/dates";
import type { ProjectContract, ProjectContractStatus } from "./types";

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return s || null;
}

function mapContract(row: Record<string, unknown>): ProjectContract {
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    contractNo: String(row.contract_no ?? ""),
    title: String(row.title ?? ""),
    partyName: String(row.party_name ?? ""),
    value: Number(row.value ?? 0),
    signedAt: toIsoDate(row.signed_at),
    status: (row.status as ProjectContractStatus) || "draft",
    notes: String(row.notes ?? ""),
    createdBy: (row.created_by as number | null) ?? null,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  };
}

const STATUSES: ProjectContractStatus[] = ["draft", "signed", "active", "closed", "cancelled"];

export function isValidContractStatus(s: string): s is ProjectContractStatus {
  return STATUSES.includes(s as ProjectContractStatus);
}

export async function listProjectContracts(projectId: number): Promise<ProjectContract[]> {
  const rows = await tenantQuery<Record<string, unknown>>(
    `SELECT * FROM project_contracts WHERE project_id = $1 ORDER BY signed_at DESC NULLS LAST, id DESC`,
    [projectId]
  );
  return rows.map(mapContract);
}

export async function createProjectContract(input: {
  projectId: number;
  contractNo: string;
  title?: string;
  partyName?: string;
  value?: number;
  signedAt?: string | null;
  status?: ProjectContractStatus;
  notes?: string;
  createdBy: number;
}): Promise<ProjectContract> {
  const row = await tenantQueryOne<Record<string, unknown>>(
    `INSERT INTO project_contracts
       (project_id, contract_no, title, party_name, value, signed_at, status, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      input.projectId,
      input.contractNo.trim(),
      input.title?.trim() || "",
      input.partyName?.trim() || "",
      input.value ?? 0,
      input.signedAt || null,
      input.status || "draft",
      input.notes?.trim() || "",
      input.createdBy,
    ]
  );
  if (!row) throw new Error("Không tạo được hợp đồng");
  return mapContract(row);
}

export async function updateProjectContract(
  contractId: number,
  projectId: number,
  input: Partial<
    Pick<
      ProjectContract,
      "contractNo" | "title" | "partyName" | "value" | "signedAt" | "status" | "notes"
    >
  >
): Promise<void> {
  const cur = await tenantQueryOne<Record<string, unknown>>(
    `SELECT * FROM project_contracts WHERE id = $1 AND project_id = $2`,
    [contractId, projectId]
  );
  if (!cur) throw new Error("Không tìm thấy hợp đồng");
  const c = mapContract(cur);
  await tenantExecute(
    `UPDATE project_contracts SET
       contract_no = $1, title = $2, party_name = $3, value = $4,
       signed_at = $5, status = $6, notes = $7, updated_at = NOW()
     WHERE id = $8 AND project_id = $9`,
    [
      input.contractNo ?? c.contractNo,
      input.title ?? c.title,
      input.partyName ?? c.partyName,
      input.value ?? c.value,
      input.signedAt === undefined ? c.signedAt : input.signedAt,
      input.status ?? c.status,
      input.notes ?? c.notes,
      contractId,
      projectId,
    ]
  );
}

export async function deleteProjectContract(contractId: number, projectId: number): Promise<void> {
  await tenantExecute(`DELETE FROM project_contracts WHERE id = $1 AND project_id = $2`, [
    contractId,
    projectId,
  ]);
}

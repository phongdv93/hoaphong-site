import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import { toLocalDateString } from "@/lib/dates";
import type { PhaseStatus, ProjectItem } from "./types";

/** % hoàn thành = tổng quantity_done / tổng quantity (bỏ hạng mục cancelled). */
export function computeItemsProgressPercent(items: Pick<ProjectItem, "quantity" | "quantityDone" | "status">[]): number {
  if (items.length === 0) return 0;

  let totalQty = 0;
  let totalDone = 0;

  for (const it of items) {
    if (it.status === "cancelled") continue;
    const qty = Math.max(0, Number(it.quantity) || 0);
    const done = Math.max(0, Number(it.quantityDone) || 0);

    if (qty <= 0) {
      if (done > 0) {
        totalQty += 1;
        totalDone += 1;
      }
      continue;
    }

    totalQty += qty;
    totalDone += Math.min(done, qty);
  }

  if (totalQty <= 0) return 0;
  return Math.min(100, Math.round((totalDone / totalQty) * 100));
}

export function derivePhaseStatusFromProgress(
  percent: number,
  currentStatus: PhaseStatus
): PhaseStatus {
  if (percent >= 100) return "done";
  if (percent <= 0) {
    return currentStatus === "delayed" ? "delayed" : "pending";
  }
  if (currentStatus === "delayed") return "delayed";
  return "in_progress";
}

/** Cập nhật % và trạng thái các công đoạn đang gán theo hạng mục. */
export async function syncPhasesProgressFromItems(projectId: number): Promise<void> {
  const linked = await tenantQuery<{ id: number; status: string }>(
    `SELECT id, status FROM project_phases
     WHERE project_id = $1 AND progress_from_items = TRUE`,
    [projectId]
  );
  if (linked.length === 0) return;

  const itemRows = await tenantQuery<{
    quantity: number;
    quantity_done: number;
    status: string;
  }>(
    `SELECT quantity, quantity_done, status FROM project_items WHERE project_id = $1`,
    [projectId]
  );
  const items = itemRows.map((r) => ({
    quantity: Number(r.quantity),
    quantityDone: Number(r.quantity_done ?? 0),
    status: r.status as ProjectItem["status"],
  }));
  const percent = computeItemsProgressPercent(items);
  const today = new Date().toISOString().slice(0, 10);

  for (const ph of linked) {
    const status = derivePhaseStatusFromProgress(percent, ph.status as PhaseStatus);
    const row = await tenantQueryOne<{ started_at: unknown; completed_at: unknown }>(
      `SELECT started_at, completed_at FROM project_phases WHERE id = $1`,
      [ph.id]
    );
    let startedAt = row?.started_at ? toLocalDateString(row.started_at) : null;
    let completedAt = row?.completed_at ? toLocalDateString(row.completed_at) : null;

    if (status === "in_progress" && !startedAt) startedAt = today;
    if (status === "done") {
      if (!startedAt) startedAt = today;
      if (!completedAt) completedAt = today;
    }

    await tenantExecute(
      `UPDATE project_phases SET
         progress_percent = $1,
         status = $2,
         started_at = COALESCE($3, started_at),
         completed_at = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [percent, status, startedAt, completedAt, ph.id]
    );
  }
}

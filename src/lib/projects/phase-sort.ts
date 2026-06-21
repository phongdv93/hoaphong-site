import type { ProjectPhase } from "./types";

export type PhaseInsertPosition = "end" | "start" | "after";

/** Tính sort_order khi thêm công đoạn (thứ tự hiển thị = sort_order tăng dần). */
export function computePhaseSortOrder(
  phases: ProjectPhase[],
  position: PhaseInsertPosition,
  afterPhaseId?: number | null
): number {
  if (!phases.length) return 10;

  const sorted = [...phases].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  if (position === "start") {
    return sorted[0].sortOrder - 10;
  }

  if (position === "after" && afterPhaseId != null) {
    const idx = sorted.findIndex((p) => p.id === afterPhaseId);
    if (idx < 0) {
      return sorted[sorted.length - 1].sortOrder + 10;
    }
    const cur = sorted[idx].sortOrder;
    const next = sorted[idx + 1]?.sortOrder;
    if (next == null) return cur + 10;
    const gap = next - cur;
    if (gap > 1) return cur + Math.floor(gap / 2);
    return cur + 1;
  }

  return sorted[sorted.length - 1].sortOrder + 10;
}

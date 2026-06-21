import type { ProjectGanttPhase } from "./types";

export type PhaseTimeRange = {
  phase: ProjectGanttPhase;
  rangeStart: string;
  rangeEnd: string;
};

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00`);
  const b = Date.parse(`${toIso}T00:00:00`);
  return Math.round((b - a) / (24 * 3600 * 1000));
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Khoảng thời gian thật của công đoạn — ưu tiên startedAt + deadlineAt (kết thúc). */
export function resolvePhaseTimeRange(
  phase: ProjectGanttPhase,
  projectStart: string,
  projectEnd: string,
  sequentialFallback?: { rangeStart: string; rangeEnd: string }
): { rangeStart: string; rangeEnd: string } {
  if (phase.startedAt && phase.deadlineAt) {
    let rangeStart = phase.startedAt;
    let rangeEnd = phase.deadlineAt;
    if (rangeEnd < rangeStart) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }
    return { rangeStart, rangeEnd };
  }
  if (phase.startedAt) {
    return {
      rangeStart: phase.startedAt,
      rangeEnd: phase.deadlineAt ?? projectEnd,
    };
  }
  if (phase.deadlineAt) {
    return {
      rangeStart: phase.startedAt ?? projectStart,
      rangeEnd: phase.deadlineAt,
    };
  }
  if (sequentialFallback) return sequentialFallback;
  return { rangeStart: projectStart, rangeEnd: projectEnd };
}

function buildSequentialFallbacks(
  phases: ProjectGanttPhase[],
  projectStart: string,
  projectEnd: string
): Map<number, { rangeStart: string; rangeEnd: string }> {
  const sorted = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const map = new Map<number, { rangeStart: string; rangeEnd: string }>();
  if (sorted.length === 0 || projectEnd < projectStart) return map;

  const hasAnyDeadline = sorted.some((p) => p.deadlineAt);
  if (!hasAnyDeadline) {
    const n = sorted.length;
    const totalDays = Math.max(1, daysBetween(projectStart, projectEnd) + 1);
    const daysEach = Math.max(1, Math.floor(totalDays / n));
    let cursor = projectStart;
    sorted.forEach((phase, i) => {
      const isLast = i === n - 1;
      let rangeEnd = isLast ? projectEnd : addDays(cursor, daysEach - 1);
      if (rangeEnd > projectEnd) rangeEnd = projectEnd;
      map.set(phase.id, { rangeStart: cursor, rangeEnd });
      cursor = addDays(rangeEnd, 1);
    });
    return map;
  }

  let cursor = projectStart;
  sorted.forEach((ph, i) => {
    const isLast = i === sorted.length - 1;
    let rangeEnd: string;
    if (isLast) {
      rangeEnd = projectEnd;
    } else if (ph.deadlineAt) {
      rangeEnd = ph.deadlineAt;
    } else {
      const next = sorted.slice(i + 1).find((p) => p.deadlineAt);
      rangeEnd = next?.deadlineAt ?? projectEnd;
    }
    if (rangeEnd < cursor) rangeEnd = cursor;
    if (rangeEnd > projectEnd) rangeEnd = projectEnd;
    map.set(ph.id, { rangeStart: cursor, rangeEnd });
    cursor = addDays(rangeEnd, 1);
    if (cursor > projectEnd && !isLast) cursor = projectEnd;
  });

  const last = sorted[sorted.length - 1];
  const lastRow = map.get(last.id);
  if (lastRow) lastRow.rangeEnd = projectEnd;

  return map;
}

/** Danh sách công đoạn với khoảng ngày để vẽ Gantt. */
export function getPhaseTimeRanges(
  phases: ProjectGanttPhase[],
  projectStart: string,
  projectEnd: string
): PhaseTimeRange[] {
  const sorted = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const fallbacks = buildSequentialFallbacks(sorted, projectStart, projectEnd);
  return sorted.map((phase) => {
    const fb = fallbacks.get(phase.id);
    const { rangeStart, rangeEnd } = resolvePhaseTimeRange(
      phase,
      projectStart,
      projectEnd,
      fb
    );
    return { phase, rangeStart, rangeEnd };
  });
}

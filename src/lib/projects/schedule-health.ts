import type { Project, ProjectGanttPhase, ProjectSummary } from "./types";

export type ScheduleHealth =
  | "done"
  | "done_late"
  | "on_track"
  | "at_risk"
  | "overdue"
  | "no_schedule";

export interface ScheduleAnalysis {
  health: ScheduleHealth;
  progressPercent: number;
  /** % tiến độ kỳ vọng theo thời gian đã trôi (null nếu không đủ ngày bắt đầu/kết thúc) */
  expectedProgressPercent: number | null;
  /** Kỳ vọng − thực tế (dương = đang chậm so với tiến độ thời gian) */
  scheduleGapPercent: number | null;
  daysOverdue: number;
  phaseDelayedCount: number;
  delayedPhaseNames: string[];
  label: string;
  alertLevel: "none" | "warn" | "danger";
}

export function projectProgressPercent(
  project: Pick<ProjectSummary, "phaseCount" | "phaseDoneCount" | "status">
): number {
  if (project.phaseCount > 0) {
    return Math.round((project.phaseDoneCount / project.phaseCount) * 100);
  }
  if (project.status === "done") return 100;
  return 0;
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00`);
  const b = Date.parse(`${toIso}T00:00:00`);
  return Math.round((b - a) / (24 * 3600 * 1000));
}

function isPhaseDelayed(
  ph: Pick<ProjectGanttPhase, "status" | "deadlineAt">,
  today: string
): boolean {
  if (ph.status === "delayed") return true;
  if (ph.status === "done") return false;
  if (!ph.deadlineAt) return false;
  return ph.deadlineAt < today;
}

export function analyzeProjectSchedule(
  project: Project &
    Pick<ProjectSummary, "phaseCount" | "phaseDoneCount" | "phaseDelayedCount" | "phases">,
  today: string = new Date().toISOString().slice(0, 10)
): ScheduleAnalysis {
  const progressPercent = projectProgressPercent(project);
  const phases = project.phases ?? ([] as ProjectGanttPhase[]);
  const delayedPhases = phases.filter((p) => isPhaseDelayed(p, today));
  const phaseDelayedCount =
    project.phaseDelayedCount ?? delayedPhases.length;
  const delayedPhaseNames = delayedPhases.map((p) => p.name).slice(0, 5);

  if (project.status === "done" || progressPercent >= 100) {
    let daysLate = Number(project.completedLateDays ?? 0);
    if (daysLate <= 0 && project.expectedEndDate) {
      const ref =
        project.actualEndDate && project.actualEndDate <= today
          ? project.actualEndDate
          : today;
      if (project.expectedEndDate < ref) {
        daysLate = daysBetween(project.expectedEndDate, ref);
      }
    }
    const late = daysLate > 0;
    return {
      health: late ? "done_late" : "done",
      progressPercent,
      expectedProgressPercent: 100,
      scheduleGapPercent: 0,
      daysOverdue: daysLate,
      phaseDelayedCount,
      delayedPhaseNames,
      label: late ? `Xong (trễ ${daysLate} ngày)` : "Hoàn thành",
      alertLevel: late ? "warn" : "none",
    };
  }

  let daysOverdue = 0;
  if (project.expectedEndDate && project.expectedEndDate < today) {
    daysOverdue = daysBetween(project.expectedEndDate, today);
  }

  let expectedProgressPercent: number | null = null;
  let scheduleGapPercent: number | null = null;

  if (project.startDate && project.expectedEndDate) {
    const total = daysBetween(project.startDate, project.expectedEndDate);
    if (total > 0) {
      const elapsed = daysBetween(project.startDate, today);
      expectedProgressPercent = Math.min(
        100,
        Math.max(0, Math.round((elapsed / total) * 100))
      );
      scheduleGapPercent = expectedProgressPercent - progressPercent;
    }
  }

  let health: ScheduleHealth = "no_schedule";
  let label = "Chưa có lịch";
  let alertLevel: "none" | "warn" | "danger" = "none";

  if (daysOverdue > 0) {
    health = "overdue";
    alertLevel = "danger";
    label = `Trễ ${daysOverdue} ngày`;
  } else if (
    scheduleGapPercent !== null &&
    scheduleGapPercent >= 15
  ) {
    health = "at_risk";
    alertLevel = "warn";
    label = `Chậm tiến độ ${scheduleGapPercent}%`;
  } else if (phaseDelayedCount > 0) {
    health = "at_risk";
    alertLevel = "warn";
    label =
      phaseDelayedCount === 1
        ? "1 công đoạn trễ"
        : `${phaseDelayedCount} công đoạn trễ`;
  } else if (project.startDate && project.expectedEndDate) {
    health = "on_track";
    label = "Đúng tiến độ";
  }

  return {
    health,
    progressPercent,
    expectedProgressPercent,
    scheduleGapPercent,
    daysOverdue,
    phaseDelayedCount,
    delayedPhaseNames,
    label,
    alertLevel,
  };
}

/** Màu dải / cảnh báo theo health */
export function scheduleHealthColors(health: ScheduleHealth): {
  stripe: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  overdueFill: string;
} {
  switch (health) {
    case "done":
      return {
        stripe: "#22d3ee",
        border: "rgba(34,211,238,0.45)",
        badgeBg: "rgba(34,211,238,0.2)",
        badgeText: "#a5f3fc",
        overdueFill: "transparent",
      };
    case "done_late":
      return {
        stripe: "#f97316",
        border: "rgba(249,115,22,0.75)",
        badgeBg: "rgba(249,115,22,0.3)",
        badgeText: "#fed7aa",
        overdueFill: "rgba(249,115,22,0.15)",
      };
    case "overdue":
      return {
        stripe: "#ef4444",
        border: "rgba(239,68,68,0.85)",
        badgeBg: "rgba(239,68,68,0.35)",
        badgeText: "#fecaca",
        overdueFill: "rgba(239,68,68,0.35)",
      };
    case "at_risk":
      return {
        stripe: "#f59e0b",
        border: "rgba(245,158,11,0.7)",
        badgeBg: "rgba(245,158,11,0.3)",
        badgeText: "#fde68a",
        overdueFill: "rgba(245,158,11,0.2)",
      };
    case "on_track":
      return {
        stripe: "#22c55e",
        border: "rgba(34,197,94,0.4)",
        badgeBg: "rgba(34,197,94,0.2)",
        badgeText: "#bbf7d0",
        overdueFill: "transparent",
      };
    default:
      return {
        stripe: "#64748b",
        border: "rgba(139,156,181,0.25)",
        badgeBg: "rgba(100,116,139,0.25)",
        badgeText: "#94a3b8",
        overdueFill: "transparent",
      };
  }
}

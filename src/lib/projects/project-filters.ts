import type {
  Project,
  ProjectGanttPhase,
  ProjectPhase,
  ProjectStatus,
  ProjectSummary,
} from "./types";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONES } from "./constants";
import {
  analyzeProjectSchedule,
  isPhaseDelayed,
  scheduleHealthColors,
} from "./schedule-health";

export type ProjectListFilter = ProjectStatus | "all" | "overdue" | "deleted";

export function projectProgressPercent(project: ProjectSummary): number {
  const phases = project.phases ?? [];
  if (phases.length > 0) {
    const total = phases.reduce((sum, ph) => {
      const pct = Math.min(100, Math.max(0, Number(ph.progressPercent ?? 0)));
      return sum + (ph.status === "done" ? 100 : pct);
    }, 0);
    return Math.round(total / phases.length);
  }
  if (project.phaseCount > 0) {
    return Math.round((project.phaseDoneCount / project.phaseCount) * 100);
  }
  return 0;
}

/** Lọc trạng thái — “Đang thi công” gồm cả dự án có % > 0 dù DB vẫn ghi open. */
export function ganttPhasesFromProjectPhases(
  phases: ProjectPhase[]
): ProjectGanttPhase[] {
  return phases.map((ph) => ({
    id: ph.id,
    name: ph.name,
    status: ph.status,
    deadlineAt: ph.deadlineAt,
    startedAt: ph.startedAt,
    sortOrder: ph.sortOrder,
    progressPercent: ph.progressPercent,
  }));
}

/** Cập nhật summary trên Gantt sau khi lưu tiến độ trong panel */
export function patchProjectSummaryFromWorkspace(
  current: ProjectSummary,
  workspace: { project: Project; phases: ProjectPhase[] }
): ProjectSummary {
  const gantt = ganttPhasesFromProjectPhases(workspace.phases);
  const phaseDoneCount = workspace.phases.filter((p) => p.status === "done").length;
  const merged: ProjectSummary = {
    ...current,
    ...workspace.project,
    phases: gantt,
    phaseCount: workspace.phases.length,
    phaseDoneCount,
    phaseDelayedCount: current.phaseDelayedCount,
    memberCount: current.memberCount,
    customerName: current.customerName,
    managerName: current.managerName,
  };
  const progress = projectProgressPercent(merged);
  let status = workspace.project.status;
  if (progress >= 100) status = "done";
  else if (progress > 0 && status === "open") status = "in_progress";
  return { ...merged, status };
}

export function projectIsOverdue(
  project: Pick<
    ProjectSummary,
    "status" | "expectedEndDate" | "phaseDelayedCount" | "phases"
  >,
  today: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (project.status === "done" || project.status === "cancelled") return false;
  if (project.expectedEndDate && project.expectedEndDate < today) return true;
  if ((project.phaseDelayedCount ?? 0) > 0) return true;
  const phases = project.phases ?? [];
  return phases.some((ph) => isPhaseDelayed(ph, today));
}

/** Tổng số ngày hợp đồng (ngày bắt đầu → ngày kết thúc dự kiến) */
export function projectContractDayCount(project: ProjectSummary): number | null {
  if (!project.startDate || !project.expectedEndDate) return null;
  const a = Date.parse(`${project.startDate}T00:00:00`);
  const b = Date.parse(`${project.expectedEndDate}T00:00:00`);
  const total = Math.round((b - a) / (24 * 3600 * 1000));
  return total >= 0 ? total : null;
}

/** Cột Số ngày trên danh sách — thời lượng hợp đồng */
export function projectListDayLabel(project: ProjectSummary): {
  text: string;
  tone: "muted";
} {
  const days = projectContractDayCount(project);
  if (days === null) return { text: "—", tone: "muted" };
  return { text: `${days} ngày`, tone: "muted" };
}

/** Trạng thái hiển thị trên danh sách — ưu tiên phân tích lịch (trễ, rủi ro) */
export function projectListStatusDisplay(
  project: ProjectSummary,
  today: string = new Date().toISOString().slice(0, 10)
): {
  label: string;
  toneClass?: string;
  badgeStyle?: { background: string; color: string };
} {
  const schedule = analyzeProjectSchedule(project, today);
  const hc = scheduleHealthColors(schedule.health);

  if (
    schedule.health === "overdue" ||
    schedule.health === "at_risk" ||
    schedule.health === "done" ||
    schedule.health === "done_late" ||
    schedule.health === "on_track"
  ) {
    return {
      label: schedule.label,
      badgeStyle: { background: hc.badgeBg, color: hc.badgeText },
    };
  }

  const progress = projectProgressPercent(project);
  let status: ProjectStatus = project.status;
  if (progress >= 100) status = "done";
  else if (progress > 0 && status === "open") status = "in_progress";

  return {
    label: PROJECT_STATUS_LABELS[status],
    toneClass: PROJECT_STATUS_TONES[status],
  };
}

export function projectMatchesStatusFilter(
  project: ProjectSummary,
  filter: ProjectListFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "deleted") return false;
  if (filter === "overdue") return projectIsOverdue(project);

  const progress = projectProgressPercent(project);
  const status = project.status;

  switch (filter) {
    case "open":
      return status === "open" && progress === 0;
    case "in_progress":
      if (status === "in_progress") return true;
      if (status === "on_hold" || status === "cancelled" || status === "done") {
        return false;
      }
      return progress > 0;
    case "on_hold":
      return status === "on_hold";
    case "done":
      return status === "done" || progress >= 100;
    case "cancelled":
      return status === "cancelled";
    default:
      return status === filter;
  }
}

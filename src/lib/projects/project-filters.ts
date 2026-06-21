import type {
  Project,
  ProjectGanttPhase,
  ProjectPhase,
  ProjectStatus,
  ProjectSummary,
} from "./types";

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

export function projectMatchesStatusFilter(
  project: ProjectSummary,
  filter: ProjectStatus | "all"
): boolean {
  if (filter === "all") return true;

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

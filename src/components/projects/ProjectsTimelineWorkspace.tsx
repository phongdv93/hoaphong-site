"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@/lib/marketing/customer-types";
import type { Project, ProjectPhase, ProjectSummary } from "@/lib/projects/types";
import { ProjectsGantt } from "./ProjectsGantt";
import { ProjectCreatePanel } from "./ProjectCreatePanel";
import {
  ProjectTaskPanel,
  PROJECT_PANEL_W,
  PROJECT_PANEL_RAIL_W,
} from "./ProjectTaskPanel";

const PANEL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export function ProjectsTimelineWorkspace({
  projects,
  dayWidth,
  panelProjectId,
  createOpen,
  onClosePanel,
  onOpenProjectPanel,
  onProjectUpdated,
  onProjectCreated,
  className = "",
}: {
  projects: ProjectSummary[];
  dayWidth: number;
  panelProjectId: number | null;
  createOpen: boolean;
  onClosePanel: () => void;
  onOpenProjectPanel: (projectId: number) => void;
  onProjectUpdated?: (
    projectId: number,
    workspace: { project: Project; phases: ProjectPhase[] }
  ) => void;
  onProjectCreated?: (projectId: number) => void;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const panelOpen = createOpen || panelProjectId !== null;
  const panelW = !panelOpen
    ? 0
    : createOpen
    ? PROJECT_PANEL_W
    : panelCollapsed
    ? PROJECT_PANEL_RAIL_W
    : PROJECT_PANEL_W;

  useEffect(() => {
    if (!createOpen) return;
    fetch("/api/marketing/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setCustomers(Array.isArray(rows) ? rows : []))
      .catch(() => setCustomers([]));
  }, [createOpen]);

  useEffect(() => {
    if (panelProjectId !== null) setPanelCollapsed(false);
  }, [panelProjectId]);

  return (
    <div className={`flex flex-row h-full min-h-0 min-w-0 overflow-hidden ${className}`}>
      <ProjectsGantt
        projects={projects}
        expandedId={expandedId}
        panelProjectId={panelProjectId}
        onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
        onOpenPanel={onOpenProjectPanel}
        dayWidth={dayWidth}
        className="flex-1 min-w-0 min-h-0 h-full"
      />

      {panelOpen && (
        <div
          className="shrink-0 flex flex-col h-full min-h-0 z-40 isolate shadow-2xl shadow-black/60 border-l border-white/10"
          style={{
            width: panelW,
            transition: `width 300ms ${PANEL_EASE}`,
          }}
        >
          {createOpen ? (
            <ProjectCreatePanel
              customers={customers}
              onClose={onClosePanel}
              onCreated={(id) => {
                onProjectCreated?.(id);
                onClosePanel();
              }}
            />
          ) : panelProjectId !== null ? (
            <ProjectTaskPanel
              projectId={panelProjectId}
              onClose={onClosePanel}
              collapsed={panelCollapsed}
              onCollapsedChange={setPanelCollapsed}
              onProjectUpdated={onProjectUpdated}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@/lib/marketing/customer-types";
import type { Project, ProjectPhase, ProjectTemplate } from "@/lib/projects/types";
import { ProjectCreatePanel } from "./ProjectCreatePanel";
import {
  ProjectTaskPanel,
  PROJECT_PANEL_RAIL_W,
  PROJECT_PANEL_W,
} from "./ProjectTaskPanel";

const PANEL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export function ProjectPanelColumn({
  createOpen,
  panelProjectId,
  customers,
  onClosePanel,
  onProjectUpdated,
  onProjectCreated,
  onProjectDeleted,
  initialQuoteIds,
  initialTemplate,
}: {
  createOpen: boolean;
  panelProjectId: number | null;
  customers: Customer[];
  onClosePanel: () => void;
  onProjectUpdated?: (
    projectId: number,
    workspace: { project: Project; phases: ProjectPhase[] }
  ) => void;
  onProjectCreated?: (projectId: number) => void;
  onProjectDeleted?: (projectId: number) => void;
  initialQuoteIds?: number[];
  initialTemplate?: ProjectTemplate | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const panelOpen = createOpen || panelProjectId !== null;

  useEffect(() => {
    if (panelProjectId !== null) setCollapsed(false);
  }, [panelProjectId]);

  if (!panelOpen) return null;

  const panelW = createOpen
    ? PROJECT_PANEL_W
    : collapsed
      ? PROJECT_PANEL_RAIL_W
      : PROJECT_PANEL_W;

  return (
    <div
      className="shrink-0 flex flex-col h-full min-h-0 overflow-hidden z-40 isolate shadow-2xl shadow-black/60 border-l border-white/10"
      style={{
        width: panelW,
        transition: `width 300ms ${PANEL_EASE}`,
      }}
    >
      {createOpen ? (
        <ProjectCreatePanel
          customers={customers}
          onClose={onClosePanel}
          initialQuoteIds={initialQuoteIds}
          initialTemplate={initialTemplate}
          onCreated={(id) => {
            onProjectCreated?.(id);
            onClosePanel();
          }}
        />
      ) : panelProjectId !== null ? (
        <ProjectTaskPanel
          projectId={panelProjectId}
          onClose={onClosePanel}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          onProjectUpdated={onProjectUpdated}
          onProjectDeleted={onProjectDeleted}
        />
      ) : null}
    </div>
  );
}

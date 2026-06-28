"use client";

import { useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/projects/types";
import { ProjectsGantt } from "./ProjectsGantt";

export function ProjectsTimelineWorkspace({
  projects,
  dayWidth,
  panelProjectId,
  onOpenProjectPanel,
  className = "",
}: {
  projects: ProjectSummary[];
  dayWidth: number;
  panelProjectId: number | null;
  onOpenProjectPanel: (projectId: number) => void;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <ProjectsGantt
      projects={projects}
      expandedId={expandedId}
      panelProjectId={panelProjectId}
      onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
      onOpenPanel={onOpenProjectPanel}
      dayWidth={dayWidth}
      className={className}
    />
  );
}

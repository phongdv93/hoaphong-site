/** Khuôn dự án — quyết định section panel và mức độ wizard. */

export type ProjectTemplate = "task" | "job" | "project" | "pi";

export type ProjectPanelTabId =
  | "overview"
  | "phases"
  | "progress"
  | "submissions"
  | "items"
  | "purchaseOrders"
  | "chat"
  | "files"
  | "members"
  | "contracts";

export type ProjectPanelMode = "simple" | "full";

export const PROJECT_TEMPLATE_LABELS: Record<ProjectTemplate, string> = {
  task: "Việc nhanh",
  job: "Công việc nhóm",
  project: "Dự án",
  pi: "Dự án PI / HĐ",
};

export const TEMPLATE_PANEL_TABS: Record<ProjectTemplate, ProjectPanelTabId[]> = {
  task: ["overview", "progress", "chat", "files"],
  job: ["overview", "members", "chat", "files"],
  project: [
    "overview",
    "phases",
    "progress",
    "submissions",
    "items",
    "files",
    "members",
    "chat",
  ],
  pi: [
    "overview",
    "phases",
    "progress",
    "submissions",
    "items",
    "contracts",
    "files",
    "members",
    "chat",
  ],
};

const SIMPLE_TABS: ProjectPanelTabId[] = ["overview", "chat", "files"];

export function normalizeProjectTemplate(raw: string | null | undefined): ProjectTemplate {
  if (raw === "task" || raw === "job" || raw === "pi") return raw;
  return "project";
}

export function visiblePanelTabs(
  template: ProjectTemplate,
  panelMode: ProjectPanelMode
): ProjectPanelTabId[] {
  const allowed = TEMPLATE_PANEL_TABS[template];
  if (panelMode === "full") return allowed;
  return SIMPLE_TABS.filter((t) => allowed.includes(t));
}

export function templateFromCreationMode(mode: "free" | "pi", template?: ProjectTemplate): ProjectTemplate {
  if (template) return template;
  return mode === "pi" ? "pi" : "project";
}

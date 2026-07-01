"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Paperclip,
  Users,
  ChevronLeft,
  ChevronRight,
  Send,
  Gauge,
  GitBranch,
  Inbox,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  FileSignature,
  LayoutList,
  Maximize2,
  type LucideIcon,
} from "lucide-react";
import { ProjectPhasesTab } from "./tabs/ProjectPhasesTab";
import { ProjectMembersTab } from "./tabs/ProjectMembersTab";
import { ProjectFilesTab } from "./tabs/ProjectFilesTab";
import { ProjectContractsTab } from "./tabs/ProjectContractsTab";
import { ProjectItemsTab, ProjectItemsSearch, filterProjectItems } from "./tabs/ProjectItemsTab";
import {
  ProgressTab,
  SubmissionsTab,
  SubmissionDetailModal,
  SubmissionChatCard,
  roleCanUpdateProgress,
  roleCanSubmit,
  roleCanReview,
} from "./ProjectWorkspaceTabs";
import {
  PHASE_STATUS_LABELS,
  PHASE_STATUS_TONES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
} from "@/lib/projects/constants";
import {
  analyzeProjectSchedule,
  scheduleHealthColors,
} from "@/lib/projects/schedule-health";
import { formatDateVi } from "@/lib/dates";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import type {
  Project,
  ProjectPhase,
  ProjectFile,
  ProjectItem,
  ProjectMember,
  ProjectMemberRole,
  ProjectMessage,
  ProjectSubmission,
  ProjectContract,
} from "@/lib/projects/types";
import {
  PROJECT_TEMPLATE_LABELS,
  visiblePanelTabs,
  type ProjectPanelMode,
  type ProjectPanelTabId,
} from "@/lib/projects/project-templates";

const PANEL_MODE_KEY = "hoaphong_project_panel_mode";

export const PROJECT_PANEL_W = 620;
export const PROJECT_PANEL_RAIL_W = 52;
const CONTENT_W = PROJECT_PANEL_W - PROJECT_PANEL_RAIL_W;
const PANEL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

type TabId = ProjectPanelTabId;

const ALL_TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "phases", label: "Công đoạn", icon: GitBranch },
  { id: "progress", label: "Tiến độ", icon: Gauge },
  { id: "submissions", label: "Yêu cầu", icon: Inbox },
  { id: "items", label: "Hạng mục", icon: ListChecks },
  { id: "contracts", label: "Hợp đồng", icon: FileSignature },
  { id: "files", label: "Tệp", icon: Paperclip },
  { id: "members", label: "Thành viên", icon: Users },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

interface WorkspacePayload {
  project: Project;
  phases: ProjectPhase[];
  members: ProjectMember[];
  messages: ProjectMessage[];
  submissions: ProjectSubmission[];
  progressLogs?: import("@/lib/projects/types").PhaseProgressLog[];
  files: ProjectFile[];
  items: ProjectItem[];
  contracts?: ProjectContract[];
  myRole?: ProjectMemberRole | null;
  canEditMeta?: boolean;
}

export function ProjectTaskPanel({
  projectId,
  onClose,
  collapsed,
  onCollapsedChange,
  onProjectUpdated,
  onProjectDeleted,
}: {
  projectId: number;
  onClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  onProjectUpdated?: (
    projectId: number,
    workspace: { project: Project; phases: ProjectPhase[] }
  ) => void;
  onProjectDeleted?: (projectId: number) => void;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [detailSubmission, setDetailSubmission] = useState<ProjectSubmission | null>(
    null
  );
  const [itemsSearch, setItemsSearch] = useState("");
  const [filesRefresh, setFilesRefresh] = useState(0);
  const [panelMode, setPanelMode] = useState<ProjectPanelMode>("simple");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<TabId, HTMLElement | null>>>({});
  const [chatViewportH, setChatViewportH] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PANEL_MODE_KEY);
      if (saved === "simple" || saved === "full") setPanelMode(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setChatViewportH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, collapsed, data]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/workspace`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tải được dữ liệu");
      setData(null);
    } else {
      const payload = (await res.json()) as WorkspacePayload;
      setData(payload);
      if (opts?.silent) {
        onProjectUpdated?.(projectId, {
          project: payload.project,
          phases: payload.phases,
        });
      }
    }
    if (!opts?.silent) {
      setLoading(false);
    }
  }, [projectId, onProjectUpdated]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendChat() {
    const text = chatDraft.trim();
    if (!text || sending) return;
    setSending(true);
    const res = await fetch(`/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (res.ok) {
      setChatDraft("");
      await load({ silent: true });
    }
  }

  function scrollToSection(id: TabId) {
    setTab(id);
    if (collapsed) onCollapsedChange(false);
    requestAnimationFrame(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function pickTab(id: TabId) {
    scrollToSection(id);
  }

  function toggleCollapsed() {
    onCollapsedChange(!collapsed);
  }

  const p = data?.project;
  const today = new Date().toISOString().slice(0, 10);
  const schedule =
    p && data
      ? analyzeProjectSchedule(
          {
            ...p,
            phases: data.phases.map((ph) => ({
              id: ph.id,
              name: ph.name,
              status: ph.status,
              deadlineAt: ph.deadlineAt,
              startedAt: ph.startedAt,
              sortOrder: ph.sortOrder,
              progressPercent: ph.progressPercent,
            })),
            phaseCount: data.phases.length,
            phaseDoneCount: data.phases.filter((x) => x.status === "done").length,
            phaseDelayedCount: data.phases.filter(
              (x) =>
                x.status === "delayed" ||
                (x.deadlineAt != null && x.deadlineAt < today && x.status !== "done")
            ).length,
          },
          today
        )
      : null;
  const accentColor = schedule
    ? scheduleHealthColors(schedule.health).stripe
    : "#3b9fe8";
  const myRole = data?.myRole ?? null;
  const canEdit = myRole === "owner" || myRole === "manager";
  const canEditMeta = Boolean(data?.canEditMeta);
  const canUpdate = roleCanUpdateProgress(myRole);
  const canSubmit = roleCanSubmit(myRole);
  const canReview = roleCanReview(myRole);

  const activeTabs = useMemo(() => {
    const template = p?.template ?? "project";
    const ids = visiblePanelTabs(template, panelMode);
    return ALL_TABS.filter((t) => ids.includes(t.id));
  }, [p?.template, panelMode]);

  useEffect(() => {
    if (!activeTabs.some((t) => t.id === tab)) {
      setTab(activeTabs[0]?.id ?? "overview");
    }
  }, [activeTabs, tab]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || loading || !data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit?.target.id.startsWith("section-")) return;
        const id = hit.target.id.replace("section-", "") as TabId;
        setTab(id);
      },
      { root, threshold: [0.2, 0.45, 0.7], rootMargin: "0px 0px -40% 0px" }
    );
    for (const t of activeTabs) {
      const el = sectionRefs.current[t.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [data, loading, activeTabs]);

  function togglePanelMode() {
    setPanelMode((m) => {
      const next: ProjectPanelMode = m === "simple" ? "full" : "simple";
      try {
        localStorage.setItem(PANEL_MODE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function patchProject(body: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Cập nhật thất bại");
      return false;
    }
    await load({ silent: true });
    return true;
  }

  async function pauseProject() {
    if (!p || !confirm("Tạm dừng dự án này?")) return;
    await patchProject({ status: "on_hold" });
  }

  async function resumeProject() {
    if (!p || !confirm("Tiếp tục dự án này?")) return;
    await patchProject({ status: "in_progress" });
  }

  async function deleteProject() {
    if (
      !p ||
      !confirm(
        "Xóa dự án khỏi timeline? Dự án sẽ chuyển vào danh mục «Đã xóa» — có thể khôi phục sau."
      )
    ) {
      return;
    }
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Xóa thất bại");
      return;
    }
    onProjectDeleted?.(projectId);
    onClose();
  }

  async function openSubmission(id: number) {
    const res = await fetch(`/api/projects/${projectId}/submissions/${id}`);
    if (res.ok) {
      const j = await res.json();
      setDetailSubmission(j.submission);
    } else if (data?.submissions) {
      const found = data.submissions.find((s) => s.id === id);
      if (found) setDetailSubmission(found);
    }
  }

  return (
    <div
      className="flex flex-1 min-h-0 h-full w-full overflow-hidden border-l border-white/15"
      style={{
        background: "linear-gradient(180deg, #0e172b 0%, #0a1120 100%)",
        color: "#f1f5f9",
      }}
    >
      {/* Icon rail */}
      <div
        className="flex flex-col items-center py-2 gap-0.5 shrink-0 self-stretch min-h-0 border-r border-white/12"
        style={{ width: PROJECT_PANEL_RAIL_W, background: "#131f38" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/12 text-slate-300 hover:text-white mb-1"
          title="Đóng panel"
        >
          <X size={16} />
        </button>
        {activeTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTab(t.id)}
              className={`p-2 rounded-lg w-10 h-10 flex items-center justify-center transition-colors ${
                active
                  ? "bg-sky/35 text-sky-light ring-1 ring-sky/50 shadow-sm shadow-sky/20"
                  : "text-slate-300 hover:bg-white/12 hover:text-white"
              }`}
              title={t.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          type="button"
          onClick={toggleCollapsed}
          className="p-2 rounded-lg hover:bg-white/12 text-slate-300 hover:text-white mb-1"
          title={collapsed ? "Mở rộng panel" : "Thu gọn (chỉ icon)"}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <div
        className="flex flex-col min-h-0 overflow-hidden transition-[width,opacity] duration-300"
        style={{
          width: collapsed ? 0 : CONTENT_W,
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? "none" : "auto",
          transitionTimingFunction: PANEL_EASE,
        }}
      >
        <div
          className="flex flex-col flex-1 min-h-0 relative"
          style={{ width: CONTENT_W }}
        >
          {/* Header */}
          <div
            className="shrink-0 px-3 py-2.5 border-b border-white/15 bg-[#0f1a2e]/90"
            style={{ borderTop: `4px solid ${accentColor}` }}
          >
            {loading ? (
              <div className="text-xs text-slate-300">Đang tải…</div>
            ) : p ? (
              <>
                <div className="text-[10px] font-mono text-slate-300 truncate">
                  {p.code || "—"}
                  {p.customerName ? ` · ${p.customerName}` : ""}
                </div>
                <div className="text-sm font-semibold text-white truncate leading-tight">
                  {p.name}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PROJECT_STATUS_TONES[p.status]}`}
                  >
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/12 text-slate-200 border border-white/10">
                    {PROJECT_TEMPLATE_LABELS[p.template ?? "project"]}
                  </span>
                  <button
                    type="button"
                    onClick={togglePanelMode}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-slate-300 hover:bg-white/10 inline-flex items-center gap-1"
                    title={panelMode === "simple" ? "Mở rộng panel" : "Thu gọn panel"}
                  >
                    {panelMode === "simple" ? (
                      <>
                        <Maximize2 size={11} /> Đầy đủ
                      </>
                    ) : (
                      <>
                        <LayoutList size={11} /> Gọn
                      </>
                    )}
                  </button>
                  {schedule && schedule.daysOverdue > 0 && (
                    <span className="text-[10px] text-orange-300">
                      {schedule.label}
                    </span>
                  )}
                  {canEdit && (
                    <ProjectHeaderMenu
                      status={p.status}
                      onPause={pauseProject}
                      onResume={resumeProject}
                      onDelete={deleteProject}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-rose-300">{error}</div>
            )}
          </div>

          {/* Body — cuộn liên tục qua các mục */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-3 py-1 text-xs">
            {loading && <p className="text-slate-400 py-4">Đang tải…</p>}
            {!loading && error && <p className="text-rose-300 py-4">{error}</p>}
            {!loading && data && (
              <>
                {activeTabs.some((t) => t.id === "overview") && (
                <PanelSection
                  id="overview"
                  label="Tổng quan"
                  setRef={(el) => {
                    sectionRefs.current.overview = el;
                  }}
                >
                  <OverviewTab
                    project={data.project}
                    phases={data.phases}
                    canEditMeta={canEditMeta}
                    onSave={patchProject}
                    compact={panelMode === "simple"}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "phases") && (
                <PanelSection
                  id="phases"
                  label="Công đoạn"
                  setRef={(el) => {
                    sectionRefs.current.phases = el;
                  }}
                >
                  <ProjectPhasesTab
                    project={data.project}
                    phases={data.phases}
                    members={data.members}
                    canEdit={canEdit}
                    onChanged={() => load({ silent: true })}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "progress") && (
                <PanelSection
                  id="progress"
                  label="Tiến độ"
                  setRef={(el) => {
                    sectionRefs.current.progress = el;
                  }}
                >
                  <ProgressTab
                    projectId={projectId}
                    phases={data.phases}
                    progressLogs={data.progressLogs ?? []}
                    canUpdate={canUpdate}
                    projectTemplate={data.project.template}
                    onSaved={() => {
                      load({ silent: true });
                      setFilesRefresh((v) => v + 1);
                    }}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "submissions") && (
                <PanelSection
                  id="submissions"
                  label="Yêu cầu"
                  setRef={(el) => {
                    sectionRefs.current.submissions = el;
                  }}
                >
                  <SubmissionsTab
                    projectId={projectId}
                    phases={data.phases}
                    submissions={data.submissions ?? []}
                    canSubmit={canSubmit}
                    onCreated={load}
                    onOpen={setDetailSubmission}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "items") && (
                <PanelSection
                  id="items"
                  label="Hạng mục"
                  setRef={(el) => {
                    sectionRefs.current.items = el;
                  }}
                  extra={
                    <ProjectItemsSearch
                      value={itemsSearch}
                      onChange={setItemsSearch}
                      total={data.items.length}
                      filtered={filterProjectItems(data.items, itemsSearch).length}
                    />
                  }
                >
                  <ProjectItemsTab
                    projectId={projectId}
                    items={data.items}
                    canEdit={canEdit}
                    searchQuery={itemsSearch}
                    linkedPhases={data.phases.filter((p) => p.progressFromItems)}
                    onChanged={() => load({ silent: true })}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "contracts") && (
                <PanelSection
                  id="contracts"
                  label="Hợp đồng"
                  setRef={(el) => {
                    sectionRefs.current.contracts = el;
                  }}
                >
                  <ProjectContractsTab
                    projectId={projectId}
                    contracts={data.contracts ?? []}
                    canEdit={canEdit}
                    onChanged={() => load({ silent: true })}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "files") && (
                <PanelSection
                  id="files"
                  label="Tệp"
                  setRef={(el) => {
                    sectionRefs.current.files = el;
                  }}
                >
                  <ProjectFilesTab
                    projectId={projectId}
                    canEdit={canEdit}
                    refreshKey={filesRefresh}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "members") && (
                <PanelSection
                  id="members"
                  label="Thành viên"
                  setRef={(el) => {
                    sectionRefs.current.members = el;
                  }}
                >
                  <ProjectMembersTab
                    project={data.project}
                    members={data.members}
                    canEdit={canEdit}
                    onChanged={() => load({ silent: true })}
                  />
                </PanelSection>
                )}
                {activeTabs.some((t) => t.id === "chat") && (
                <PanelSection
                  id="chat"
                  label="Chat"
                  setRef={(el) => {
                    sectionRefs.current.chat = el;
                  }}
                  className="flex flex-col !border-b-0"
                  style={chatViewportH > 0 ? { minHeight: chatViewportH } : undefined}
                >
                  <ChatTab
                    messages={data.messages}
                    draft={chatDraft}
                    onDraftChange={setChatDraft}
                    onSend={sendChat}
                    sending={sending}
                    onOpenSubmission={openSubmission}
                  />
                </PanelSection>
                )}
              </>
            )}
          </div>

          {detailSubmission && (
            <SubmissionDetailModal
              submission={detailSubmission}
              projectId={projectId}
              canReview={canReview}
              onClose={() => setDetailSubmission(null)}
              onUpdated={load}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const PANEL_FIELD_CLS =
  "w-full h-[30px] rounded-md border border-white/20 bg-[#162236] px-2 text-[11px] text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky/40 focus:border-sky/60";

function PanelSection({
  id,
  label,
  children,
  extra,
  className = "",
  style,
  setRef,
}: {
  id: TabId;
  label: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  setRef: (el: HTMLElement | null) => void;
}) {
  return (
    <section
      id={`section-${id}`}
      ref={setRef}
      style={style}
      className={`py-3 border-b border-white/15 scroll-mt-0 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2 sticky top-0 z-[2] bg-[#0e172b]/98 backdrop-blur-sm py-1.5 -mx-1 px-1 border-b border-white/10">
        <h3 className="text-[11px] uppercase tracking-wide text-sky-light font-bold">
          {label}
        </h3>
        {extra}
      </div>
      <div className="flex flex-col flex-1 min-h-0">{children}</div>
    </section>
  );
}

function ProjectHeaderMenu({
  status,
  onPause,
  onResume,
  onDelete,
}: {
  status: Project["status"];
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const showPause = status !== "done" && status !== "cancelled" && status !== "on_hold";
  const showResume = status === "on_hold";

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg border border-white/15 text-slate-400 hover:text-white hover:bg-white/10"
        aria-label="Thao tác dự án"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-[100] min-w-[10.5rem] py-1 rounded-xl border border-white/15 shadow-2xl shadow-black/60"
          style={{ background: "linear-gradient(180deg, #121d33 0%, #0c1426 100%)" }}
        >
          {showPause && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onPause();
              }}
              className="w-full text-left px-3 py-2 text-xs text-amber-200 hover:bg-white/8 flex items-center gap-2"
            >
              <Pause size={14} /> Tạm dừng
            </button>
          )}
          {showResume && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onResume();
              }}
              className="w-full text-left px-3 py-2 text-xs text-emerald-200 hover:bg-white/8 flex items-center gap-2"
            >
              <Play size={14} /> Tiếp tục
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 border-t border-white/10"
          >
            <Trash2 size={14} /> Xóa dự án
          </button>
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  project,
  phases,
  canEditMeta,
  onSave,
  compact = false,
}: {
  project: Project;
  phases: ProjectPhase[];
  canEditMeta: boolean;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
  compact?: boolean;
}) {
  const progress =
    phases.length > 0
      ? Math.round(
          (phases.filter((ph) => ph.status === "done").length / phases.length) *
            100
        )
      : 0;

  const fieldIn = PANEL_FIELD_CLS;

  return (
    <div className="space-y-4">
      {canEditMeta && !compact && (
        <p className="text-[10px] text-sky-200/80 bg-sky-500/10 border border-sky-500/25 rounded px-2 py-1.5">
          Bạn có quyền quản trị — có thể sửa thông tin dự án bên dưới.
        </p>
      )}

      {phases.length > 0 && (
      <div className="rounded-lg bg-[#121d33] border border-white/15 p-2.5 shadow-sm shadow-black/20">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-slate-300 font-medium">Tiến độ tổng (công đoạn)</span>
          <span className="text-sky-light font-semibold tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 bg-white/12 rounded overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky to-sky-light transition-all" style={{ width: `${progress}%` }} />
        </div>
        {!compact && (
          <p className="text-[10px] text-slate-400 mt-1.5">
            Cập nhật % từng công đoạn ở tab <strong className="text-slate-200">Tiến độ</strong>.
          </p>
        )}
      </div>
      )}

      <dl className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        {!compact && (
        <EditableInfo
          label="Mã dự án"
          canEdit={canEditMeta}
          value={project.code}
          onCommit={(v) => onSave({ code: v })}
          mono
        />
        )}
        <EditableInfo
          label="Tên dự án"
          canEdit={canEditMeta}
          value={project.name}
          onCommit={(v) => onSave({ name: v })}
          className={compact ? "" : "col-span-2"}
        />
        <EditableDate
          label="Bắt đầu"
          canEdit={canEditMeta}
          value={project.startDate}
          onCommit={(v) => onSave({ startDate: v })}
        />
        <EditableDate
          label="Dự kiến HT"
          canEdit={canEditMeta}
          value={project.expectedEndDate}
          onCommit={(v) => onSave({ expectedEndDate: v })}
        />
        {!compact && (
        <>
        <EditableDate
          label="HT thực tế"
          canEdit={canEditMeta}
          value={project.actualEndDate}
          onCommit={(v) => onSave({ actualEndDate: v })}
        />
        <EditableDate
          label="Ký HĐ"
          canEdit={canEditMeta}
          value={project.contractSignedAt}
          onCommit={(v) => onSave({ contractSignedAt: v })}
        />
        <EditableInfo
          label="Giá HĐ"
          canEdit={canEditMeta}
          value={project.contractValue ? String(project.contractValue) : ""}
          onCommit={(v) => onSave({ contractValue: v ? Number(v.replace(/\D/g, "")) : null })}
          inputMode="numeric"
        />
        <Info label="Quản lý" value={project.managerName || "—"} />
        <EditableInfo
          label="Địa chỉ CT"
          canEdit={canEditMeta}
          value={project.address || ""}
          onCommit={(v) => onSave({ address: v })}
          className="col-span-2"
        />
        <EditableInfo
          label="Địa chỉ cung cấp"
          canEdit={canEditMeta}
          value={project.supplierAddress || ""}
          onCommit={(v) => onSave({ supplierAddress: v })}
          className="col-span-2"
        />
        <EditableInfo
          label="Xuất khẩu"
          canEdit={canEditMeta}
          value={project.exportCountry || ""}
          onCommit={(v) => onSave({ exportCountry: v })}
        />
        </>
        )}
        {compact && (
          <Info label="Quản lý" value={project.managerName || "—"} />
        )}
        {project.completedLateDays > 0 && (
          <Info
            label="Trễ khi hoàn thành"
            value={`${project.completedLateDays} ngày`}
          />
        )}
      </dl>

      {(project.notes || canEditMeta) && (
        <div>
          <div className="text-[10px] uppercase text-slate-500 mb-1">Ghi chú</div>
          {canEditMeta ? (
            <textarea
              key={project.updatedAt}
              defaultValue={project.notes || ""}
              rows={3}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (project.notes || "")) void onSave({ notes: v });
              }}
              className={`${fieldIn} resize-y min-h-[60px]`}
            />
          ) : (
            <p className="text-slate-200 whitespace-pre-wrap">{project.notes}</p>
          )}
        </div>
      )}

      {phases.length > 0 && (
        <div>
          <div className="text-[10px] uppercase text-slate-500 mb-2">
            Công đoạn gần deadline
          </div>
          <ul className="space-y-1.5">
            {phases.slice(0, 5).map((ph) => (
              <li
                key={ph.id}
                className="flex items-center justify-between gap-2 bg-white/5 rounded px-2 py-1.5"
              >
                <span className="truncate text-slate-200">{ph.name}</span>
                <span
                  className={`shrink-0 text-[10px] px-1 rounded ${PHASE_STATUS_TONES[ph.status]}`}
                >
                  {PHASE_STATUS_LABELS[ph.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}

function ChatTab({
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  onOpenSubmission,
}: {
  messages: ProjectMessage[];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  onOpenSubmission: (id: number) => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <p className="text-[10px] text-slate-500 mb-2 shrink-0">
        Tin có phiếu đính kèm — bấm &quot;Xem chi tiết&quot; để duyệt yêu cầu / báo cáo.
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 mb-3 pr-0.5">
        {messages.length === 0 ? (
          <p className="text-slate-300">Chưa có tin nhắn. Gửi tin đầu tiên bên dưới.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="bg-[#121d33] border border-white/12 rounded-lg px-2.5 py-2">
              <div className="flex justify-between gap-2 text-[10px] text-slate-400 mb-0.5">
                <span className="font-medium text-slate-300">
                  {m.userName || "Hệ thống"}
                </span>
                <span className="shrink-0">{fmtDateTime(m.createdAt)}</span>
              </div>
              <p className="text-slate-100 whitespace-pre-wrap">{m.body}</p>
              {m.submission && (
                <SubmissionChatCard
                  submission={m.submission}
                  onOpen={() => onOpenSubmission(m.submission!.id)}
                />
              )}
            </div>
          ))
        )}
      </div>
      <div className="shrink-0 flex gap-1 border-t border-white/10 pt-2">
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={2}
          placeholder="Nhập tin nhắn…"
          className="flex-1 bg-[#162236] border border-white/15 rounded px-2 py-1.5 text-slate-100 resize-none outline-none focus:border-sky/60 focus:ring-2 focus:ring-sky/30"
        />
        <button
          type="button"
          disabled={sending || !draft.trim()}
          onClick={onSend}
          className="self-end p-2 rounded bg-sky text-white disabled:opacity-40 hover:bg-sky-light"
          title="Gửi"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function EditableInfo({
  label,
  value,
  canEdit,
  onCommit,
  className = "",
  mono,
  inputMode,
}: {
  label: string;
  value: string;
  canEdit: boolean;
  onCommit: (v: string) => void;
  className?: string;
  mono?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const fieldIn = PANEL_FIELD_CLS;
  if (!canEdit) {
    return (
      <Info
        label={label}
        value={
          label === "Giá HĐ" && value
            ? `${Number(value).toLocaleString("vi-VN")} ₫`
            : value
        }
        className={className}
      />
    );
  }
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">{label}</dt>
      <dd className="mt-0.5">
        <input
          key={`${label}-${value}`}
          defaultValue={value}
          inputMode={inputMode}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== value) onCommit(v);
          }}
          className={`${fieldIn} ${mono ? "font-mono" : ""}`}
        />
      </dd>
    </div>
  );
}

function EditableDate({
  label,
  value,
  canEdit,
  onCommit,
}: {
  label: string;
  value: string | null;
  canEdit: boolean;
  onCommit: (v: string | null) => void;
}) {
  if (!canEdit) {
    return <Info label={label} value={fmtDate(value)} />;
  }
  return (
    <div>
      <dt className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">{label}</dt>
      <dd className="mt-0.5">
        <ErpDateInput
          value={value ?? ""}
          onChange={() => {}}
          onCommit={(v) => {
            if (v !== value) onCommit(v || null);
          }}
          className="text-[11px] !h-[30px]"
        />
      </dd>
    </div>
  );
}

function Info({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">{label}</dt>
      <dd className="text-white mt-0.5 font-medium">{value || "—"}</dd>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  return formatDateVi(iso);
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

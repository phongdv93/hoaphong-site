"use client";

import { useCallback, useEffect, useState } from "react";
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
  FileText,
  Download,
  Gauge,
  GitBranch,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { ProjectPhasesTab } from "./tabs/ProjectPhasesTab";
import { ProjectMembersTab } from "./tabs/ProjectMembersTab";
import { ProjectItemsTab } from "./tabs/ProjectItemsTab";
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
import type {
  Project,
  ProjectPhase,
  ProjectFile,
  ProjectItem,
  ProjectMember,
  ProjectMemberRole,
  ProjectMessage,
  ProjectSubmission,
} from "@/lib/projects/types";

export const PROJECT_PANEL_W = 520;
export const PROJECT_PANEL_RAIL_W = 52;
const CONTENT_W = PROJECT_PANEL_W - PROJECT_PANEL_RAIL_W;
const PANEL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

type TabId =
  | "overview"
  | "phases"
  | "progress"
  | "submissions"
  | "items"
  | "chat"
  | "files"
  | "members";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] =
  [
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { id: "phases", label: "Công đoạn", icon: GitBranch },
    { id: "progress", label: "Tiến độ", icon: Gauge },
    { id: "submissions", label: "Yêu cầu", icon: Inbox },
    { id: "items", label: "Hạng mục", icon: ListChecks },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "files", label: "Tệp", icon: Paperclip },
    { id: "members", label: "Thành viên", icon: Users },
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
  myRole?: ProjectMemberRole | null;
}

export function ProjectTaskPanel({
  projectId,
  onClose,
  collapsed,
  onCollapsedChange,
  onProjectUpdated,
}: {
  projectId: number;
  onClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  onProjectUpdated?: (
    projectId: number,
    workspace: { project: Project; phases: ProjectPhase[] }
  ) => void;
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
      await load();
      setTab("chat");
    }
  }

  function pickTab(id: TabId) {
    setTab(id);
    if (collapsed) onCollapsedChange(false);
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
  const canUpdate = roleCanUpdateProgress(myRole);
  const canSubmit = roleCanSubmit(myRole);
  const canReview = roleCanReview(myRole);

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
        "Xóa dự án? Bạn có 8 giờ để hoàn tác (liên hệ admin hoặc gọi API restore)."
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
      className="flex flex-1 min-h-0 h-full w-full overflow-hidden"
      style={{
        background: "#0a1120",
        color: "#e2e8f0",
      }}
    >
      {/* Icon rail */}
      <div
        className="flex flex-col items-center py-2 gap-0.5 shrink-0 self-stretch min-h-0"
        style={{ width: PROJECT_PANEL_RAIL_W, background: "#0e172b" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 mb-1"
          title="Đóng panel"
        >
          <X size={16} />
        </button>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTab(t.id)}
              className={`p-2 rounded-lg w-10 h-10 flex items-center justify-center ${
                active
                  ? "bg-sky/25 text-sky-light"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
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
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 mb-1"
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
            className="shrink-0 px-3 py-2.5 border-b border-white/10"
            style={{ borderTop: `3px solid ${accentColor}` }}
          >
            {loading ? (
              <div className="text-xs text-slate-400">Đang tải…</div>
            ) : p ? (
              <>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {p.code || "—"}
                  {p.customerName ? ` · ${p.customerName}` : ""}
                </div>
                <div className="text-sm font-semibold text-white truncate leading-tight">
                  {p.name}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${PROJECT_STATUS_TONES[p.status]}`}
                  >
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                  {schedule && schedule.daysOverdue > 0 && (
                    <span className="text-[10px] text-orange-300">
                      {schedule.label}
                    </span>
                  )}
                  {p.status === "on_hold" ? (
                    <button
                      type="button"
                      onClick={resumeProject}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/15"
                    >
                      Tiếp tục
                    </button>
                  ) : p.status !== "done" && p.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={pauseProject}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/15"
                    >
                      Tạm dừng
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={deleteProject}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/15 ml-auto"
                  >
                    Xóa
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-rose-300">{error}</div>
            )}
          </div>

          {/* Tab label */}
          <div className="shrink-0 px-3 py-1.5 text-xs font-medium text-slate-300 border-b border-white/5">
            {TABS.find((t) => t.id === tab)?.label}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 text-xs">
            {loading && <p className="text-slate-400">Đang tải…</p>}
            {!loading && error && (
              <p className="text-rose-300">{error}</p>
            )}
            {!loading && data && tab === "overview" && (
              <OverviewTab project={data.project} phases={data.phases} />
            )}
            {!loading && data && tab === "phases" && (
              <ProjectPhasesTab
                project={data.project}
                phases={data.phases}
                members={data.members}
                canEdit={canEdit}
                onChanged={() => load({ silent: true })}
              />
            )}
            {!loading && data && tab === "progress" && (
              <ProgressTab
                projectId={projectId}
                phases={data.phases}
                progressLogs={data.progressLogs ?? []}
                canUpdate={canUpdate}
                onSaved={() => load({ silent: true })}
              />
            )}
            {!loading && data && tab === "submissions" && (
              <SubmissionsTab
                projectId={projectId}
                phases={data.phases}
                submissions={data.submissions ?? []}
                canSubmit={canSubmit}
                onCreated={load}
                onOpen={setDetailSubmission}
              />
            )}
            {!loading && data && tab === "items" && (
              <ProjectItemsTab
                projectId={projectId}
                items={data.items}
                canEdit={canEdit}
                onChanged={() => load({ silent: true })}
              />
            )}
            {!loading && data && tab === "chat" && (
              <ChatTab
                messages={data.messages}
                draft={chatDraft}
                onDraftChange={setChatDraft}
                onSend={sendChat}
                sending={sending}
                onOpenSubmission={openSubmission}
              />
            )}
            {!loading && data && tab === "files" && (
              <FilesTab files={data.files} />
            )}
            {!loading && data && tab === "members" && (
              <ProjectMembersTab
                project={data.project}
                members={data.members}
                canEdit={canEdit}
                onChanged={() => load({ silent: true })}
              />
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

function OverviewTab({
  project,
  phases,
}: {
  project: Project;
  phases: ProjectPhase[];
}) {
  const progress =
    phases.length > 0
      ? Math.round(
          (phases.filter((ph) => ph.status === "done").length / phases.length) *
            100
        )
      : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-slate-400">Tiến độ tổng (công đoạn)</span>
          <span className="text-white font-medium tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded overflow-hidden">
          <div className="h-full bg-sky transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">
          Cập nhật % từng công đoạn ở tab <strong className="text-slate-300">Tiến độ</strong>.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Info label="Bắt đầu" value={fmtDate(project.startDate)} />
        <Info label="Dự kiến HT" value={fmtDate(project.expectedEndDate)} />
        <Info label="HT thực tế" value={fmtDate(project.actualEndDate)} />
        <Info label="Ký HĐ" value={fmtDate(project.contractSignedAt)} />
        <Info
          label="Giá HĐ"
          value={
            project.contractValue
              ? `${project.contractValue.toLocaleString("vi-VN")} ₫`
              : "—"
          }
        />
        <Info label="Quản lý" value={project.managerName || "—"} />
        <Info label="Địa chỉ CT" value={project.address || "—"} className="col-span-2" />
        <Info
          label="Địa chỉ cung cấp"
          value={project.supplierAddress || "—"}
          className="col-span-2"
        />
        <Info label="Xuất khẩu" value={project.exportCountry || "—"} />
        {project.completedLateDays > 0 && (
          <Info
            label="Trễ khi hoàn thành"
            value={`${project.completedLateDays} ngày`}
          />
        )}
      </dl>

      {project.notes && (
        <div>
          <div className="text-[10px] uppercase text-slate-500 mb-1">Ghi chú</div>
          <p className="text-slate-200 whitespace-pre-wrap">{project.notes}</p>
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
    <div className="flex flex-col h-full min-h-[280px]">
      <p className="text-[10px] text-slate-500 mb-2 shrink-0">
        Tin có phiếu đính kèm — bấm &quot;Xem chi tiết&quot; để duyệt yêu cầu / báo cáo.
      </p>
      <div className="flex-1 space-y-2 mb-3">
        {messages.length === 0 ? (
          <p className="text-slate-400">Chưa có tin nhắn. Gửi tin đầu tiên bên dưới.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="bg-white/5 rounded-lg px-2.5 py-2">
              <div className="flex justify-between gap-2 text-[10px] text-slate-500 mb-0.5">
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
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-slate-100 resize-none outline-none focus:border-sky/50"
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

function FilesTab({ files }: { files: ProjectFile[] }) {
  if (files.length === 0) {
    return (
      <p className="text-slate-400">
        Chưa có file đính kèm. Tải lên sẽ có trong trang chi tiết (sắp có).
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-start gap-2 bg-white/5 rounded-lg px-2.5 py-2"
        >
          <FileText size={16} className="text-sky shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-white truncate">{f.fileName}</div>
            <div className="text-[10px] text-slate-400">
              {formatBytes(f.fileSize)}
              {f.uploaderName && ` · ${f.uploaderName}`}
              {` · ${fmtDateTime(f.createdAt)}`}
            </div>
          </div>
          {f.fileUrl && (
            <a
              href={f.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-sky hover:bg-white/10 rounded"
              title="Tải xuống"
            >
              <Download size={14} />
            </a>
          )}
        </li>
      ))}
    </ul>
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
      <dt className="text-[10px] uppercase text-slate-500">{label}</dt>
      <dd className="text-slate-100 mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN");
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

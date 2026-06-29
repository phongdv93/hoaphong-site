"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, FolderKanban, List, Plus, Search } from "lucide-react";
import { useErpHeaderActionsSlot } from "@/components/erp/ErpPageHeader";
import {
  patchProjectSummaryFromWorkspace,
  projectListDayLabel,
  projectListStatusDisplay,
  projectMatchesStatusFilter,
  projectProgressPercent,
} from "@/lib/projects/project-filters";
import type { Customer } from "@/lib/marketing/customer-types";
import type { Project, ProjectPhase } from "@/lib/projects/types";
import type { ProjectSummary } from "@/lib/projects/types";
import {
  DEFAULT_DAY_WIDTH,
  MAX_GANTT_DAY_WIDTH,
  MIN_GANTT_DAY_WIDTH,
} from "./ProjectsGantt";
import { ProjectsTimelineWorkspace } from "./ProjectsTimelineWorkspace";
import { ProjectPanelColumn } from "./ProjectPanelColumn";
import { DeletedProjectsCatalog } from "./DeletedProjectsCatalog";
import { StatusFilterCombo, type ProjectStatusFilter } from "./StatusFilterCombo";
import { useOnCompanyChanged } from "@/lib/erp/use-on-company-changed";

const DAY_WIDTH_STORAGE_KEY = "hoaphong_gantt_day_width_v1";

type ViewMode = "timeline" | "list";

export function ProjectListClient() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-slate-400 p-8 pt-4">Đang tải…</div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ProjectListInner />
      </div>
    </Suspense>
  );
}

function ProjectListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setHeaderActions = useErpHeaderActionsSlot();
  const [rawItems, setRawItems] = useState<ProjectSummary[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("timeline");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [dayWidth, setDayWidth] = useState(DEFAULT_DAY_WIDTH);
  const [panelProjectId, setPanelProjectId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [canCreate, setCanCreate] = useState(true);
  const [createBlockedMsg, setCreateBlockedMsg] = useState<string | null>(null);
  const [deletedItems, setDeletedItems] = useState<ProjectSummary[] | null>(null);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DAY_WIDTH_STORAGE_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n)) {
          setDayWidth(Math.max(MIN_GANTT_DAY_WIDTH, Math.min(MAX_GANTT_DAY_WIDTH, n)));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function onDayWidthChange(value: number) {
    const v = Math.max(MIN_GANTT_DAY_WIDTH, Math.min(MAX_GANTT_DAY_WIDTH, value));
    setDayWidth(v);
    try {
      localStorage.setItem(DAY_WIDTH_STORAGE_KEY, String(v));
    } catch {
      // ignore
    }
  }

  const handleProjectUpdated = useCallback(
    (
      projectId: number,
      workspace: { project: Project; phases: ProjectPhase[] }
    ) => {
      setRawItems((prev) =>
        prev?.map((p) =>
          p.id === projectId ? patchProjectSummaryFromWorkspace(p, workspace) : p
        ) ?? null
      );
    },
    []
  );

  useEffect(() => {
    if (!createOpen) return;
    fetch("/api/marketing/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setCustomers(Array.isArray(rows) ? rows : []))
      .catch(() => setCustomers([]));
  }, [createOpen]);

  const loadDeleted = useCallback(async () => {
    setDeletedLoading(true);
    const params = new URLSearchParams({ deleted: "1" });
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/projects?${params.toString()}`);
    if (!res.ok) {
      setDeletedItems([]);
      setDeletedLoading(false);
      return;
    }
    setDeletedItems(await res.json());
    setDeletedLoading(false);
  }, [q]);

  const load = useCallback(async () => {
    setErrorBanner(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/projects?${params.toString()}`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErrorBanner(j.error || "Không tải được danh sách");
      setRawItems([]);
      return;
    }
    setRawItems(await res.json());
  }, [q]);

  const loadCreatePermission = useCallback(async () => {
    const res = await fetch("/api/projects/create-permission");
    if (!res.ok) {
      setCanCreate(false);
      setCreateBlockedMsg("Không kiểm tra được quyền tạo dự án");
      return;
    }
    const j = (await res.json()) as { allowed?: boolean; reason?: string };
    setCanCreate(Boolean(j.allowed));
    setCreateBlockedMsg(j.allowed ? null : j.reason || "Không có quyền tạo dự án");
  }, []);

  useEffect(() => {
    void loadCreatePermission();
  }, [loadCreatePermission]);

  useEffect(() => {
    if (statusFilter === "deleted") {
      setPanelProjectId(null);
      setCreateOpen(false);
      router.replace("/erp/du-an", { scroll: false });
      void loadDeleted();
      return;
    }
    void load();
  }, [statusFilter, load, loadDeleted, router]);

  useOnCompanyChanged(() => {
    setRawItems(null);
    setPanelProjectId(null);
    setCreateOpen(false);
    router.replace("/erp/du-an", { scroll: false });
    void load();
    void loadCreatePermission();
  });

  /** Chỉ mở panel từ URL khi dự án thuộc công ty hiện tại (tránh ?p= cũ sau đổi công ty). */
  useEffect(() => {
    const p = searchParams.get("p");
    const create = searchParams.get("create");
    if (create === "1") {
      setCreateOpen(true);
      setPanelProjectId(null);
      return;
    }
    if (!p || !Number.isFinite(Number(p))) {
      return;
    }
    const id = Number(p);
    if (rawItems === null) return;
    if (rawItems.some((row) => row.id === id)) {
      setPanelProjectId(id);
      setCreateOpen(false);
    } else {
      setPanelProjectId(null);
      setCreateOpen(false);
      router.replace("/erp/du-an", { scroll: false });
    }
  }, [searchParams, rawItems, router]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (statusFilter === "deleted") void loadDeleted();
      else void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function openProjectPanel(id: number) {
    setCreateOpen(false);
    setPanelProjectId(id);
    router.replace(`/erp/du-an?p=${id}`, { scroll: false });
  }

  const openCreatePanel = useCallback(() => {
    if (!canCreate) {
      alert(createBlockedMsg || "Bạn không có quyền tạo dự án trong công ty này.");
      return;
    }
    setPanelProjectId(null);
    setCreateOpen(true);
    router.replace("/erp/du-an?create=1", { scroll: false });
  }, [canCreate, createBlockedMsg, router]);

  function closePanel() {
    setPanelProjectId(null);
    setCreateOpen(false);
    router.replace("/erp/du-an", { scroll: false });
  }

  function handleProjectCreated(id: number) {
    setCreateOpen(false);
    setPanelProjectId(id);
    router.replace(`/erp/du-an?p=${id}`, { scroll: false });
    void load();
  }

  function handleProjectDeleted(projectId: number) {
    setRawItems((prev) => prev?.filter((p) => p.id !== projectId) ?? null);
    closePanel();
    if (statusFilter === "deleted") void loadDeleted();
  }

  async function restoreProject(id: number) {
    const res = await fetch(`/api/projects/${id}/restore`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(typeof j.error === "string" ? j.error : "Không khôi phục được");
      return;
    }
    await loadDeleted();
    await load();
  }

  async function purgeProject(id: number) {
    const res = await fetch(`/api/projects/${id}?permanent=1`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(typeof j.error === "string" ? j.error : "Không xóa vĩnh viễn được");
      return;
    }
    await loadDeleted();
  }

  const items = useMemo(() => {
    if (!rawItems) return null;
    if (statusFilter === "deleted") return [];
    return rawItems.filter((p) => projectMatchesStatusFilter(p, statusFilter));
  }, [rawItems, statusFilter]);

  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(
      <>
        <div className="inline-flex rounded-lg border border-white/15 bg-white/5 overflow-hidden h-[30px]">
          <button
            type="button"
            onClick={() => setView("timeline")}
            className={`px-3 text-xs inline-flex items-center gap-1 h-full ${
              view === "timeline"
                ? "bg-sky text-white"
                : "text-slate-300 hover:bg-white/10"
            }`}
            title="Hiển thị dạng trục thời gian"
          >
            <CalendarRange size={14} /> Trục thời gian
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 text-xs inline-flex items-center gap-1 h-full ${
              view === "list"
                ? "bg-sky text-white"
                : "text-slate-300 hover:bg-white/10"
            }`}
            title="Hiển thị dạng danh sách"
          >
            <List size={14} /> Danh sách
          </button>
        </div>
        <button
          type="button"
          onClick={openCreatePanel}
          disabled={!canCreate}
          title={createBlockedMsg ?? undefined}
          className="inline-flex items-center gap-2 bg-sky text-white px-4 rounded-lg hover:bg-sky-light text-sm h-[30px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Dự án mới
        </button>
      </>
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, view, canCreate, createBlockedMsg, openCreatePanel]);

  if (items === null) {
    return <div className="text-sm text-slate-400 pt-5 px-8">Đang tải…</div>;
  }

  const timelineMode = view === "timeline" && !errorBanner && statusFilter !== "deleted";
  const listMode = view === "list" && !errorBanner && statusFilter !== "deleted";
  const showDeletedCatalog = statusFilter === "deleted" && !errorBanner;
  const panelOpen = panelProjectId !== null || createOpen;
  /** Có panel tạo/sửa thì vẫn mount workspace dù chưa có dự án trên Gantt. */
  const timelineFull = timelineMode && (items.length > 0 || panelOpen);
  const listWithPanel = listMode && items.length > 0 && panelOpen;
  const ganttProjects = items.length > 0 ? items : rawItems ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const searchToolbar = (
    <div className="flex flex-wrap items-center gap-2 shrink-0 px-8 pt-2 pb-2 border-b border-white/10">
      <div className="flex items-center gap-1 bg-white/5 border border-white/15 rounded-lg px-2 h-[30px]">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (statusFilter === "deleted") void loadDeleted();
              else void load();
            }
          }}
          placeholder="Tìm theo mã / tên dự án…"
          className="px-1 text-sm outline-none w-56 sm:w-72 bg-transparent text-slate-100 placeholder:text-slate-500 h-full"
        />
      </div>
      <StatusFilterCombo value={statusFilter} onChange={setStatusFilter} />
      {timelineMode && (
        <input
          type="range"
          min={MIN_GANTT_DAY_WIDTH}
          max={MAX_GANTT_DAY_WIDTH}
          value={dayWidth}
          onChange={(e) => onDayWidthChange(Number(e.target.value))}
          className="w-24 sm:w-32 h-[30px] accent-sky cursor-pointer"
          title="Độ rộng ngày trên timeline"
          aria-label="Độ rộng ngày trên timeline"
        />
      )}
      <div className="flex-1" />
    </div>
  );

  return (
    <div
      className={
        timelineMode || showDeletedCatalog || listWithPanel
          ? "flex flex-col flex-1 min-h-0 overflow-hidden"
          : "space-y-4 pt-4 px-8"
      }
    >
      {!(timelineFull && panelOpen) && (timelineMode || showDeletedCatalog) && searchToolbar}
      {!timelineMode && !showDeletedCatalog && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 border border-white/15 rounded-lg px-2 h-[30px]">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (statusFilter === "deleted") void loadDeleted();
                  else void load();
                }
              }}
              placeholder="Tìm theo mã / tên dự án…"
              className="px-1 text-sm outline-none w-56 sm:w-72 bg-transparent text-slate-100 placeholder:text-slate-500 h-full"
            />
          </div>
          <StatusFilterCombo value={statusFilter} onChange={setStatusFilter} />
          <div className="flex-1" />
        </div>
      )}

      {errorBanner && (
        <div className="bg-amber-500/15 border border-amber-500/40 text-amber-100 rounded p-3 text-sm mx-8">
          {errorBanner}{" "}
          {errorBanner.includes("công ty") && (
            <Link href="/erp/cong-ty/new" className="underline font-medium text-amber-50">
              Tạo công ty trước
            </Link>
          )}
        </div>
      )}

      {items.length === 0 && !errorBanner && view !== "timeline" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <FolderKanban size={42} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-300 mb-4">Chưa có dự án nào trong công ty hiện tại.</p>
          <button
            type="button"
            onClick={openCreatePanel}
            className="inline-flex items-center gap-2 bg-sky text-white px-4 py-2 rounded-lg hover:bg-sky-light"
          >
            <Plus size={16} /> Tạo dự án đầu tiên
          </button>
        </div>
      )}

      {timelineMode && items.length === 0 && !panelOpen && (
        <div
          className="flex-1 flex items-center justify-center text-sm text-slate-400 border-t border-white/10 min-h-0"
          style={{ background: "#0a1120" }}
        >
          {rawItems && rawItems.length > 0
            ? "Không có dự án khớp bộ lọc — thử đổi trạng thái hoặc từ khóa."
            : "Chưa có dự án — bấm Dự án mới để tạo và điền thông tin bên phải."}
        </div>
      )}

      {showDeletedCatalog && (
        <DeletedProjectsCatalog
          items={deletedItems ?? []}
          loading={deletedLoading || deletedItems === null}
          onRestore={(id) => void restoreProject(id)}
          onPurge={(id) => void purgeProject(id)}
        />
      )}

      {timelineFull && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            {panelOpen && searchToolbar}
            <ProjectsTimelineWorkspace
              projects={ganttProjects}
              dayWidth={dayWidth}
              panelProjectId={panelProjectId}
              onOpenProjectPanel={openProjectPanel}
              className="flex-1 min-h-0 h-full w-full"
            />
          </div>
          <ProjectPanelColumn
            createOpen={createOpen}
            panelProjectId={panelProjectId}
            customers={customers}
            onClosePanel={closePanel}
            onProjectUpdated={handleProjectUpdated}
            onProjectCreated={handleProjectCreated}
            onProjectDeleted={handleProjectDeleted}
          />
        </div>
      )}

      {items.length > 0 && view === "list" && (
        <div
          className={
            panelOpen
              ? "flex flex-1 min-h-0 overflow-hidden border-t border-white/10"
              : "px-8"
          }
        >
          <div
            className={
              panelOpen
                ? "flex-1 min-w-0 overflow-auto px-8 py-4"
                : "w-full"
            }
          >
            <div className="bg-[#141e32] border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-slate-200">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <Th>Mã</Th>
                    <Th>Tên dự án</Th>
                    <Th>Khách hàng</Th>
                    <Th>Giá HĐ</Th>
                    <Th>Tiến độ</Th>
                    <Th>Số ngày</Th>
                    <Th>Trạng thái</Th>
                    <Th>Deadline</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const progress = projectProgressPercent(p);
                    const days = projectListDayLabel(p, today);
                    const statusDisplay = projectListStatusDisplay(p, today);
                    const isActive = panelProjectId === p.id;
                    return (
                      <tr
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openProjectPanel(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openProjectPanel(p.id);
                          }
                        }}
                        className={`border-t border-white/10 cursor-pointer transition-colors ${
                          isActive
                            ? "bg-sky/10 hover:bg-sky/15"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <td className="px-3 py-2 font-mono text-xs text-sky">
                          {p.code}
                        </td>
                        <td className="px-3 py-2 text-white">{p.name}</td>
                        <td className="px-3 py-2 text-slate-400">{p.customerName ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {p.contractValue
                            ? new Intl.NumberFormat("vi-VN").format(p.contractValue)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden min-w-16">
                              <div
                                className="h-full bg-sky"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-slate-400 tabular-nums">{progress}%</span>
                          </div>
                        </td>
                        <td
                          className={`px-3 py-2 text-xs tabular-nums whitespace-nowrap ${
                            days.tone === "danger"
                              ? "text-rose-300 font-medium"
                              : days.tone === "warn"
                                ? "text-amber-200"
                                : days.tone === "ok"
                                  ? "text-emerald-200"
                                  : "text-slate-500"
                          }`}
                        >
                          {days.text}
                        </td>
                        <td className="px-3 py-2">
                          {statusDisplay.badgeStyle ? (
                            <span
                              className="text-[11px] px-2 py-0.5 rounded whitespace-nowrap"
                              style={statusDisplay.badgeStyle}
                            >
                              {statusDisplay.label}
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded whitespace-nowrap ${statusDisplay.toneClass ?? ""}`}
                            >
                              {statusDisplay.label}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-400">
                          {p.expectedEndDate
                            ? new Date(p.expectedEndDate).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <ProjectPanelColumn
            createOpen={createOpen}
            panelProjectId={panelProjectId}
            customers={customers}
            onClosePanel={closePanel}
            onProjectUpdated={handleProjectUpdated}
            onProjectCreated={handleProjectCreated}
            onProjectDeleted={handleProjectDeleted}
          />
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium text-xs">{children}</th>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, ChevronDown, ChevronUp, Link2, Plus, Trash2, Unlink } from "lucide-react";
import {
  computePhaseSortOrder,
  type PhaseInsertPosition,
} from "@/lib/projects/phase-sort";
import { ErpSelect } from "@/components/erp/ErpSelect";
import {
  inclusiveDayCount,
  resolvePhaseSchedule,
  formatDateVi,
  type ScheduleEditField,
} from "@/lib/dates";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import type { Project, ProjectMember, ProjectPhase } from "@/lib/projects/types";

/** Lập kế hoạch công đoạn / giai đoạn — thời gian & phụ trách (không cập nhật %). */
export function ProjectPhasesTab({
  project,
  phases,
  members,
  canEdit,
  onChanged,
}: {
  project: Project;
  phases: ProjectPhase[];
  members: ProjectMember[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [addingOpen, setAddingOpen] = useState(false);
  const projectStart = project.startDate;
  const projectEnd = project.expectedEndDate;

  const sortedPhases = [...phases].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id - b.id
  );

  const memberOptions: { value: number | ""; label: string }[] = [
    { value: "", label: "— Chưa gán —" },
    ...members.map((m) => ({
      value: m.userId,
      label: m.userName || `User #${m.userId}`,
    })),
  ];

  async function updatePhase(id: number, patch: Partial<ProjectPhase>) {
    const res = await fetch(`/api/projects/${project.id}/phases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(typeof j.error === "string" ? j.error : "Cập nhật thất bại");
      return false;
    }
    await onChanged();
    return true;
  }

  async function deletePhase(id: number) {
    if (!confirm("Xóa công đoạn này?")) return;
    const res = await fetch(`/api/projects/${project.id}/phases/${id}`, {
      method: "DELETE",
    });
    if (res.ok) onChanged();
  }

  async function movePhase(id: number, direction: "up" | "down") {
    const idx = sortedPhases.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedPhases.length) return;
    const a = sortedPhases[idx];
    const b = sortedPhases[swapIdx];
    const okA = await updatePhase(a.id, { sortOrder: b.sortOrder });
    if (!okA) return;
    await updatePhase(b.id, { sortOrder: a.sortOrder });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-sky/30 bg-sky/10 px-3 py-2 text-[11px] flex items-start gap-2">
        <CalendarRange size={13} className="text-sky-light shrink-0 mt-0.5" />
        <div className="min-w-0">
          <span className="text-sky-light font-medium">Hợp đồng: </span>
          <span className="text-slate-200">
            {fmtDate(projectStart)} → {fmtDate(projectEnd)}
          </span>
          <span className="text-slate-500 block mt-0.5">
            Lập kế hoạch thời gian từng công đoạn. Cập nhật % thủ công ở tab{" "}
            <strong className="text-slate-400">Tiến độ</strong>, hoặc bấm{" "}
            <strong className="text-slate-400">Gán theo hạng mục</strong> để % tự tính từ
            tổng số lượng danh mục.
          </span>
        </div>
      </div>

      {phases.length === 0 ? (
        <p className="text-center text-slate-400 text-xs py-6">Chưa có công đoạn.</p>
      ) : (
        <ul className="space-y-2">
          {sortedPhases.map((p, index) => (
            <li
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
            >
              {/* Hàng 1: thứ tự + tên + phụ trách */}
              <div className="flex items-center gap-1 px-2 py-1.5 min-h-[34px]">
                <span
                  className="text-[9px] text-slate-500 tabular-nums w-4 shrink-0 text-center"
                  title="Thứ tự trên timeline"
                >
                  {index + 1}
                </span>
                {canEdit && (
                  <div className="flex flex-col shrink-0 gap-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void movePhase(p.id, "up")}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-25"
                      title="Lên trên"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={index === sortedPhases.length - 1}
                      onClick={() => void movePhase(p.id, "down")}
                      className="p-0.5 text-slate-500 hover:text-white disabled:opacity-25"
                      title="Xuống dưới"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                )}
                {canEdit ? (
                  <input
                    defaultValue={p.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== p.name) updatePhase(p.id, { name: v });
                    }}
                    className="input-field text-xs py-0.5 flex-1 min-w-0 font-medium"
                  />
                ) : (
                  <span className="text-xs font-medium text-slate-200 flex-1 truncate">
                    {p.name}
                  </span>
                )}
                <div className="w-[6.5rem] shrink-0">
                  {canEdit ? (
                    <ErpSelect
                      value={p.assigneeUserId ?? ""}
                      options={memberOptions}
                      onChange={(v) =>
                        updatePhase(p.id, {
                          assigneeUserId: v === "" ? null : Number(v),
                        })
                      }
                      placeholder="Phụ trách"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 truncate block">
                      {p.assigneeName ?? "—"}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => deletePhase(p.id)}
                    className="text-rose-400 hover:text-rose-300 p-0.5 shrink-0"
                    title="Xóa"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {/* Hàng 2: thời gian — luôn 1 dòng ngang */}
              <div className="px-2 pb-1.5 pt-0 border-t border-white/5 space-y-1">
                <PhaseScheduleRow
                  phase={p}
                  projectStart={projectStart}
                  projectEnd={projectEnd}
                  canEdit={canEdit}
                  onSave={updatePhase}
                />
                {canEdit && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {p.progressFromItems ? (
                      <>
                        <span className="text-[10px] text-emerald-300/90 inline-flex items-center gap-1">
                          <Link2 size={11} />
                          Tiến độ = SL hạng mục theo công đoạn này
                          {p.progressPercent > 0 && (
                            <span className="tabular-nums text-emerald-200">
                              ({p.progressPercent}%)
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => void updatePhase(p.id, { progressFromItems: false })}
                          className="text-[10px] text-slate-400 hover:text-rose-300 inline-flex items-center gap-0.5 shrink-0"
                          title="Chuyển sang cập nhật tiến độ thủ công"
                        >
                          <Unlink size={11} /> Bỏ gán
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void updatePhase(p.id, { progressFromItems: true })}
                        className="text-[10px] text-sky-light hover:text-white inline-flex items-center gap-1 border border-sky/30 rounded px-2 py-0.5 hover:bg-sky/10"
                        title="100% khi đủ số lượng tất cả hạng mục trong tab Hạng mục"
                      >
                        <Link2 size={11} /> Gán theo hạng mục
                      </button>
                    )}
                  </div>
                )}
                {!canEdit && p.progressFromItems && (
                  <p className="text-[10px] text-emerald-300/80">
                    Tiến độ theo hạng mục · {p.progressPercent}%
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="pt-1 border-t border-white/10">
          {!addingOpen ? (
            <button
              type="button"
              onClick={() => setAddingOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 border border-dashed border-white/20 text-slate-300 px-3 py-2 rounded-lg text-xs hover:bg-white/5 hover:border-sky/40 hover:text-sky-light"
            >
              <Plus size={14} /> Thêm công đoạn
            </button>
          ) : (
            <AddPhaseForm
              projectId={project.id}
              projectStart={projectStart}
              projectEnd={projectEnd}
              phases={sortedPhases}
              members={memberOptions}
              onDone={() => {
                setAddingOpen(false);
                onChanged();
              }}
              onCancel={() => setAddingOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string | null | undefined) {
  return formatDateVi(iso);
}

const SCHEDULE_LABEL = "block text-[9px] text-slate-500 leading-tight mb-0.5";
const SCHEDULE_DATE_CLS =
  "text-[9px] leading-tight py-0 px-0.5 h-[22px] w-full min-w-0";
const SCHEDULE_DAYS_CLS =
  "input-field text-[9px] py-0 px-0.5 w-full h-[22px] text-center tabular-nums";
const SCHEDULE_GRID =
  "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)] gap-x-1.5 items-end";

function PhaseScheduleRow({
  phase,
  projectStart,
  projectEnd,
  canEdit,
  onSave,
}: {
  phase: ProjectPhase;
  projectStart: string | null;
  projectEnd: string | null;
  canEdit: boolean;
  onSave: (id: number, patch: Partial<ProjectPhase>) => Promise<boolean>;
}) {
  const [startedAt, setStartedAt] = useState(phase.startedAt ?? "");
  const [deadlineAt, setDeadlineAt] = useState(phase.deadlineAt ?? "");
  const [daysDraft, setDaysDraft] = useState(() => {
    const s = phase.startedAt ?? "";
    const e = phase.deadlineAt ?? "";
    return s && e ? String(inclusiveDayCount(s, e)) : "";
  });
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = phase.startedAt ?? "";
    const e = phase.deadlineAt ?? "";
    setStartedAt(s);
    setDeadlineAt(e);
    setDaysDraft(s && e ? String(inclusiveDayCount(s, e)) : "");
    setHint("");
  }, [phase.id, phase.startedAt, phase.deadlineAt]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function apply(
    edited: ScheduleEditField,
    patch?: Partial<{ start: string; end: string; days: number }>
  ) {
    const r = resolvePhaseSchedule({
      startedAt: patch?.start ?? startedAt,
      deadlineAt: patch?.end ?? deadlineAt,
      dayCount: patch?.days ?? (Number(daysDraft) || 0),
      edited,
      projectStart,
      projectEnd,
    });
    setStartedAt(r.startedAt);
    setDeadlineAt(r.deadlineAt);
    setDaysDraft(r.dayCount > 0 ? String(r.dayCount) : "");
    setHint(r.clamped ? "Đã kẹp trong hạn dự án." : "");
    return r;
  }

  async function persist(start: string, end: string) {
    setSaving(true);
    const ok = await onSave(phase.id, {
      startedAt: start || null,
      deadlineAt: end || null,
    });
    setSaving(false);
    if (!ok) {
      const s = phase.startedAt ?? "";
      const e = phase.deadlineAt ?? "";
      setStartedAt(s);
      setDeadlineAt(e);
      setDaysDraft(s && e ? String(inclusiveDayCount(s, e)) : "");
      setHint("");
    }
  }

  function schedulePersist(start: string, end: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(start, end), 400);
  }

  if (!canEdit) {
    const d =
      phase.startedAt && phase.deadlineAt
        ? inclusiveDayCount(phase.startedAt, phase.deadlineAt)
        : 0;
    return (
      <p className="text-[10px] text-slate-400 whitespace-nowrap truncate">
        {fmtDate(phase.startedAt)} · {d > 0 ? `${d} ngày` : "—"} · {fmtDate(phase.deadlineAt)}
      </p>
    );
  }

  return (
    <div className={SCHEDULE_GRID} title={hint || undefined}>
      <label className="flex flex-col min-w-0">
        <span className={SCHEDULE_LABEL}>Bắt đầu</span>
        <ErpDateInput
          value={startedAt}
          disabled={saving}
          min={projectStart ?? undefined}
          max={projectEnd ?? undefined}
          className={SCHEDULE_DATE_CLS}
          onChange={(iso) => {
            apply("start", { start: iso });
          }}
          onCommit={(iso) => {
            const r = apply("start", { start: iso });
            schedulePersist(r.startedAt, r.deadlineAt);
          }}
        />
      </label>
      <label className="flex flex-col w-[60px] shrink-0">
        <span className={SCHEDULE_LABEL}>Ngày</span>
        <input
          type="number"
          min={1}
          value={daysDraft}
          disabled={saving || !startedAt}
          onChange={(e) => setDaysDraft(e.target.value)}
          onBlur={() => {
            const r = apply("days", { days: Math.max(1, Number(daysDraft) || 1) });
            void persist(r.startedAt, r.deadlineAt);
          }}
          className={SCHEDULE_DAYS_CLS}
        />
      </label>
      <label className="flex flex-col min-w-0">
        <span className={SCHEDULE_LABEL}>Kết thúc</span>
        <ErpDateInput
          value={deadlineAt}
          disabled={saving}
          min={startedAt || projectStart || undefined}
          max={projectEnd ?? undefined}
          className={SCHEDULE_DATE_CLS}
          onChange={(iso) => {
            apply("end", { end: iso });
          }}
          onCommit={(iso) => {
            const r = apply("end", { end: iso });
            schedulePersist(r.startedAt, r.deadlineAt);
          }}
        />
      </label>
    </div>
  );
}

function AddPhaseForm({
  projectId,
  projectStart,
  projectEnd,
  phases,
  members,
  onDone,
  onCancel,
}: {
  projectId: number;
  projectStart: string | null;
  projectEnd: string | null;
  phases: ProjectPhase[];
  members: { value: number | ""; label: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [insertPosition, setInsertPosition] = useState<PhaseInsertPosition>("end");
  const [afterPhaseId, setAfterPhaseId] = useState<number | "">(
    phases.length ? phases[phases.length - 1].id : ""
  );
  const [startedAt, setStartedAt] = useState("");
  const [daysDraft, setDaysDraft] = useState("1");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  function applySchedule(
    patch: Partial<{ start: string; end: string; days: number }>,
    edited: ScheduleEditField
  ) {
    const r = resolvePhaseSchedule({
      startedAt: patch.start ?? startedAt,
      deadlineAt: patch.end ?? deadlineAt,
      dayCount: patch.days ?? (Number(daysDraft) || 0),
      edited,
      projectStart,
      projectEnd,
    });
    setStartedAt(r.startedAt);
    setDeadlineAt(r.deadlineAt);
    setDaysDraft(r.dayCount > 0 ? String(r.dayCount) : daysDraft);
    return r;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const r = applySchedule({ days: Number(daysDraft) || 1 }, "days");
    const sortOrder = computePhaseSortOrder(
      phases,
      insertPosition,
      insertPosition === "after" ? afterPhaseId || null : null
    );
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        kind: "custom",
        sortOrder,
        startedAt: r.startedAt || null,
        deadlineAt: r.deadlineAt || null,
        assigneeUserId: assigneeUserId || null,
      }),
    });
    setSubmitting(false);
    if (res.ok) onDone();
    else {
      const j = await res.json().catch(() => ({}));
      alert(typeof j.error === "string" ? j.error : "Thêm thất bại");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-sky/10 border border-sky/30 rounded-lg p-2.5 space-y-1.5"
    >
      <div className="flex items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Tên công đoạn *"
          className="input-field text-xs py-0.5 flex-1 min-w-0"
        />
        <div className="w-[6.5rem] shrink-0">
          <ErpSelect
            value={assigneeUserId}
            options={members}
            onChange={(v) => setAssigneeUserId(v === "" ? "" : Number(v))}
            placeholder="Phụ trách"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="text-slate-500 shrink-0">Chèn vào:</span>
        <label className="inline-flex items-center gap-1 text-slate-300">
          <input
            type="radio"
            name={`pos-${projectId}`}
            checked={insertPosition === "end"}
            onChange={() => setInsertPosition("end")}
          />
          Cuối
        </label>
        <label className="inline-flex items-center gap-1 text-slate-300">
          <input
            type="radio"
            name={`pos-${projectId}`}
            checked={insertPosition === "start"}
            onChange={() => setInsertPosition("start")}
          />
          Đầu
        </label>
        <label className="inline-flex items-center gap-1 text-slate-300">
          <input
            type="radio"
            name={`pos-${projectId}`}
            checked={insertPosition === "after"}
            onChange={() => setInsertPosition("after")}
          />
          Sau
        </label>
        {insertPosition === "after" && phases.length > 0 && (
          <select
            value={afterPhaseId}
            onChange={(e) =>
              setAfterPhaseId(e.target.value ? Number(e.target.value) : "")
            }
            className="input-field text-[10px] py-0.5 max-w-[10rem] flex-1 min-w-0"
          >
            {phases.map((ph, i) => (
              <option key={ph.id} value={ph.id}>
                {i + 1}. {ph.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className={SCHEDULE_GRID}>
        <label className="flex flex-col min-w-0">
          <span className={SCHEDULE_LABEL}>Bắt đầu</span>
          <ErpDateInput
            value={startedAt}
            className={SCHEDULE_DATE_CLS}
            onChange={(iso) => applySchedule({ start: iso }, "start")}
          />
        </label>
        <label className="flex flex-col w-[60px] shrink-0">
          <span className={SCHEDULE_LABEL}>Ngày</span>
          <input
            type="number"
            min={1}
            value={daysDraft}
            onChange={(e) => setDaysDraft(e.target.value)}
            onBlur={() => applySchedule({ days: Math.max(1, Number(daysDraft) || 1) }, "days")}
            className={SCHEDULE_DAYS_CLS}
          />
        </label>
        <label className="flex flex-col min-w-0">
          <span className={SCHEDULE_LABEL}>Kết thúc</span>
          <ErpDateInput
            value={deadlineAt}
            className={SCHEDULE_DATE_CLS}
            onChange={(iso) => applySchedule({ end: iso }, "end")}
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] border border-white/20 px-2 py-1 rounded text-slate-300"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="text-[10px] bg-sky text-white px-2.5 py-1 rounded"
        >
          Thêm
        </button>
      </div>
    </form>
  );
}

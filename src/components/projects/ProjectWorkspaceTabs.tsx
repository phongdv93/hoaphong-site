"use client";

import { useState } from "react";
import {
  Check,
  X,
  ClipboardList,
  FileBarChart,
  Lightbulb,
  ChevronRight,
  ImagePlus,
  type LucideIcon,
} from "lucide-react";
import {
  PHASE_STATUS_LABELS,
  PHASE_STATUS_TONES,
  SUBMISSION_KIND_LABELS,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_TONES,
} from "@/lib/projects/constants";
import type {
  PhaseProgressLog,
  PhaseStatus,
  ProjectMemberRole,
  ProjectPhase,
  ProjectSubmission,
  ProjectSubmissionKind,
} from "@/lib/projects/types";
import { AppSelect } from "@/components/ui/AppSelect";
import { formatDateVi } from "@/lib/dates";

const SUBMISSION_KINDS: ProjectSubmissionKind[] = ["request", "report", "proposal"];

const KIND_ICONS: Record<ProjectSubmissionKind, LucideIcon> = {
  request: ClipboardList,
  report: FileBarChart,
  proposal: Lightbulb,
};

/** Cập nhật % hoàn thành từng công đoạn */
async function uploadProjectImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/projects/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Không tải được ảnh");
  }
  const j = await res.json();
  return j.url as string;
}

export function ProgressTab({
  projectId,
  phases,
  progressLogs = [],
  canUpdate,
  onSaved,
}: {
  projectId: number;
  phases: ProjectPhase[];
  progressLogs?: PhaseProgressLog[];
  canUpdate: boolean;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, { status: PhaseStatus; progress: number }>>(
    {}
  );
  const [photos, setPhotos] = useState<Record<number, File[]>>({});
  const [previews, setPreviews] = useState<Record<number, string[]>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const overall =
    phases.length > 0
      ? Math.round(
          phases.reduce(
            (s, ph) =>
              s +
              (ph.progressFromItems
                ? ph.progressPercent
                : (drafts[ph.id]?.progress ?? ph.progressPercent)),
            0
          ) / phases.length
        )
      : 0;

  function getDraft(ph: ProjectPhase) {
    return (
      drafts[ph.id] ?? {
        status: ph.status,
        progress: ph.progressPercent,
      }
    );
  }

  function setDraft(id: number, patch: Partial<{ status: PhaseStatus; progress: number }>) {
    const ph = phases.find((p) => p.id === id);
    if (!ph) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...getDraft(ph), ...patch },
    }));
  }

  function addPhotos(phaseId: number, files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      setError("Chỉ chấp nhận file ảnh");
      return;
    }
    setPhotos((prev) => ({
      ...prev,
      [phaseId]: [...(prev[phaseId] ?? []), ...list],
    }));
    setPreviews((prev) => ({
      ...prev,
      [phaseId]: [
        ...(prev[phaseId] ?? []),
        ...list.map((f) => URL.createObjectURL(f)),
      ],
    }));
    setError(null);
  }

  function removePhoto(phaseId: number, index: number) {
    setPhotos((prev) => {
      const arr = [...(prev[phaseId] ?? [])];
      arr.splice(index, 1);
      return { ...prev, [phaseId]: arr };
    });
    setPreviews((prev) => {
      const arr = [...(prev[phaseId] ?? [])];
      const url = arr[index];
      if (url) URL.revokeObjectURL(url);
      arr.splice(index, 1);
      return { ...prev, [phaseId]: arr };
    });
  }

  async function savePhase(ph: ProjectPhase) {
    const d = getDraft(ph);
    const files = photos[ph.id] ?? [];
    if (files.length === 0) {
      setError("Bắt buộc chụp/tải ít nhất 1 ảnh minh chứng trước khi lưu");
      return;
    }

    setSavingId(ph.id);
    setError(null);
    try {
      const photoUrls: string[] = [];
      for (const file of files) {
        photoUrls.push(await uploadProjectImage(file));
      }
      const res = await fetch(
        `/api/projects/${projectId}/phases/${ph.id}/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: d.status,
            progressPercent: d.progress,
            photoUrls,
            note: notes[ph.id] ?? "",
          }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Không lưu được");
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[ph.id];
        return next;
      });
      setPhotos((prev) => {
        const next = { ...prev };
        delete next[ph.id];
        return next;
      });
      setPreviews((prev) => {
        (prev[ph.id] ?? []).forEach((u) => URL.revokeObjectURL(u));
        const next = { ...prev };
        delete next[ph.id];
        return next;
      });
      setNotes((prev) => {
        const next = { ...prev };
        delete next[ph.id];
        return next;
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải ảnh");
    } finally {
      setSavingId(null);
    }
  }

  function logsForPhase(phaseId: number) {
    return progressLogs.filter((l) => l.phaseId === phaseId).slice(0, 3);
  }

  if (phases.length === 0) {
    return (
      <p className="text-slate-400">
        Chưa có công đoạn. Thêm trong{" "}
        <a href={`/erp/du-an/${projectId}`} className="text-sky hover:underline">
          trang chi tiết
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[10px] uppercase text-slate-500 tracking-wide">
            Tiến độ dự án
          </span>
          <span className="text-lg font-light tabular-nums text-white">{overall}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky transition-all duration-300"
            style={{ width: `${overall}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Trung bình % các công đoạn — cập nhật từng đoạn bên dưới.
        </p>
      </div>

      {error && <p className="text-rose-300 text-[11px]">{error}</p>}

      {!canUpdate && (
        <p className="text-amber-200/80 text-[11px] bg-amber-500/10 rounded px-2 py-1.5">
          Bạn chỉ xem. Vai trò thành viên trở lên mới cập nhật tiến độ.
        </p>
      )}

      {canUpdate && (
        <p className="text-sky-200/90 text-[11px] bg-sky-500/10 border border-sky/20 rounded px-2 py-1.5">
          Mỗi lần lưu tiến độ bắt buộc có <strong>ảnh minh chứng</strong>. Hệ thống ghi
          nhận thời gian và người cập nhật.
        </p>
      )}

      <ul className="space-y-2">
        {phases.map((ph) => {
          const d = ph.progressFromItems
            ? { status: ph.status, progress: ph.progressPercent }
            : getDraft(ph);
          const phasePhotos = photos[ph.id] ?? [];
          const phasePreviews = previews[ph.id] ?? [];
          const recentLogs = logsForPhase(ph.id);
          return (
            <li
              key={ph.id}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-white text-[13px] truncate flex items-center gap-1.5">
                    {ph.name}
                    {ph.progressFromItems && (
                      <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 shrink-0">
                        Theo hạng mục
                      </span>
                    )}
                  </div>
                  {ph.deadlineAt && (
                    <div className="text-[10px] text-slate-500">Hạn: {fmtDate(ph.deadlineAt)}</div>
                  )}
                  {ph.lastProgressAt && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Cập nhật: {fmtDateTime(ph.lastProgressAt)}
                      {ph.lastProgressByName ? ` · ${ph.lastProgressByName}` : ""}
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${PHASE_STATUS_TONES[d.status]}`}
                >
                  {PHASE_STATUS_LABELS[d.status]}
                </span>
              </div>

              {recentLogs.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {recentLogs.flatMap((log) =>
                    log.photoUrls.slice(0, 2).map((url) => (
                      <a
                        key={`${log.id}-${url}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-10 h-10 rounded overflow-hidden border border-white/10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={d.progress}
                  disabled={!canUpdate || ph.progressFromItems}
                  onChange={(e) => {
                    const progress = Number(e.target.value);
                    let status = d.status;
                    if (progress === 0) status = "pending";
                    else if (progress >= 100) status = "done";
                    else if (status === "pending" || status === "done") status = "in_progress";
                    setDraft(ph.id, { progress, status });
                  }}
                  className="flex-1 accent-sky h-1.5 disabled:opacity-70"
                />
                <span className="text-[13px] tabular-nums text-sky-light w-9 text-right">
                  {d.progress}%
                </span>
              </div>

              {ph.progressFromItems && (
                <p className="text-[10px] text-emerald-200/80 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1.5">
                  Tự tính từ tab <strong>Hạng mục</strong>: tổng cột <strong>Có</strong> ÷{" "}
                  <strong>SL</strong> của tất cả hạng mục. Đủ 100% → công đoạn hoàn thành.
                </p>
              )}

              {canUpdate && !ph.progressFromItems && (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                      Ảnh minh chứng *
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      {phasePreviews.map((src, i) => (
                        <div key={src} className="relative w-12 h-12 rounded overflow-hidden border border-white/15">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(ph.id, i)}
                            className="absolute top-0 right-0 bg-black/70 text-white text-[9px] px-0.5"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <label className="w-12 h-12 flex flex-col items-center justify-center rounded border border-dashed border-white/25 text-slate-400 hover:bg-white/5 cursor-pointer">
                        <ImagePlus size={14} />
                        <span className="text-[8px] mt-0.5">Thêm</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            addPhotos(ph.id, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <input
                    value={notes[ph.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [ph.id]: e.target.value }))
                    }
                    placeholder="Ghi chú ngắn (tuỳ chọn)"
                    className="w-full text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-200"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <AppSelect
                      value={d.status}
                      onChange={(v) => setDraft(ph.id, { status: v as PhaseStatus })}
                      className="text-[11px] bg-white/5 border border-white/10 rounded px-1.5 py-1 text-slate-200 w-36 text-left flex items-center justify-between"
                      options={(Object.keys(PHASE_STATUS_LABELS) as PhaseStatus[]).map((s) => ({
                        value: s,
                        label: PHASE_STATUS_LABELS[s],
                      }))}
                    />
                    <button
                      type="button"
                      disabled={savingId === ph.id || phasePhotos.length === 0}
                      onClick={() => savePhase(ph)}
                      className="text-[11px] px-2.5 py-1 rounded bg-sky text-white hover:bg-sky-light disabled:opacity-40"
                      title={
                        phasePhotos.length === 0
                          ? "Cần ít nhất 1 ảnh"
                          : undefined
                      }
                    >
                      {savingId === ph.id ? "Đang lưu…" : "Lưu tiến độ"}
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Gửi yêu cầu / báo cáo / đề xuất */
export function SubmissionsTab({
  projectId,
  phases,
  submissions,
  canSubmit,
  onCreated,
  onOpen,
}: {
  projectId: number;
  phases: ProjectPhase[];
  submissions: ProjectSubmission[];
  canSubmit: boolean;
  onCreated: () => void;
  onOpen: (s: ProjectSubmission) => void;
}) {
  const [kind, setKind] = useState<ProjectSubmissionKind>("request");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [phaseId, setPhaseId] = useState<string>("");
  const [postToChat, setPostToChat] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  async function submit() {
    if (!title.trim() || !detail.trim()) {
      setError("Tiêu đề và nội dung chi tiết là bắt buộc");
      return;
    }
    setSending(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title,
        summary,
        detail,
        phaseId: phaseId ? Number(phaseId) : null,
        postToChat,
      }),
    });
    setSending(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không gửi được");
      return;
    }
    setTitle("");
    setSummary("");
    setDetail("");
    setPhaseId("");
    onCreated();
  }

  return (
    <div className="space-y-3">
      {canSubmit && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="w-full flex items-center justify-between px-2.5 py-2 text-left text-slate-200 hover:bg-white/5"
          >
            <span className="text-[12px] font-medium">Tạo phiếu mới</span>
            <span className="text-slate-500 text-[10px]">{showForm ? "Thu gọn" : "Mở"}</span>
          </button>
          {showForm && (
            <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/5">
              <div className="flex gap-1">
                {SUBMISSION_KINDS.map((k) => {
                  const Icon = KIND_ICONS[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded text-[10px] ${
                        kind === k
                          ? "bg-sky/25 text-sky-light border border-sky/40"
                          : "bg-white/5 text-slate-400 border border-transparent"
                      }`}
                    >
                      <Icon size={14} />
                      {SUBMISSION_KIND_LABELS[k]}
                    </button>
                  );
                })}
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề *"
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-slate-100 text-[12px]"
              />
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Tóm tắt (hiện trên chat)"
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-slate-100 text-[12px]"
              />
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={4}
                placeholder="Nội dung chi tiết — người duyệt xem khi bấm vào phiếu *"
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-slate-100 text-[12px] resize-none"
              />
              {phases.length > 0 && (
                <AppSelect
                  value={phaseId}
                  onChange={setPhaseId}
                  className="w-full text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1.5 text-slate-200 text-left flex items-center justify-between"
                  options={[
                    { value: "", label: "Công đoạn (tuỳ chọn)" },
                    ...phases.map((ph) => ({ value: String(ph.id), label: ph.name })),
                  ]}
                />
              )}
              <label className="flex items-center gap-2 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={postToChat}
                  onChange={(e) => setPostToChat(e.target.checked)}
                  className="rounded"
                />
                Gửi thông báo vào nhóm chat
              </label>
              {error && <p className="text-rose-300 text-[11px]">{error}</p>}
              <button
                type="button"
                disabled={sending}
                onClick={submit}
                className="w-full py-2 rounded bg-sky text-white text-[12px] font-medium hover:bg-sky-light disabled:opacity-50"
              >
                {sending ? "Đang gửi…" : "Gửi phiếu"}
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        <h4 className="text-[10px] uppercase text-slate-500 mb-2">
          Đã gửi ({submissions.length})
        </h4>
        {submissions.length === 0 ? (
          <p className="text-slate-400 text-[11px]">Chưa có phiếu nào.</p>
        ) : (
          <ul className="space-y-1.5">
            {submissions.map((s) => (
              <SubmissionListItem key={s.id} submission={s} onOpen={() => onOpen(s)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SubmissionListItem({
  submission: s,
  onOpen,
}: {
  submission: ProjectSubmission;
  onOpen: () => void;
}) {
  const Icon = KIND_ICONS[s.kind];
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10 transition"
      >
        <div className="flex items-start gap-2">
          <Icon size={14} className="text-sky shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500">
                {SUBMISSION_KIND_LABELS[s.kind]}
              </span>
              <span className={`text-[9px] px-1 rounded ${SUBMISSION_STATUS_TONES[s.status]}`}>
                {SUBMISSION_STATUS_LABELS[s.status]}
              </span>
            </div>
            <div className="text-[12px] font-medium text-white truncate">{s.title}</div>
            {s.summary && (
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{s.summary}</p>
            )}
          </div>
          <ChevronRight size={14} className="text-slate-500 shrink-0 mt-1" />
        </div>
      </button>
    </li>
  );
}

export function SubmissionDetailModal({
  submission,
  projectId,
  canReview,
  onClose,
  onUpdated,
}: {
  submission: ProjectSubmission;
  projectId: number;
  canReview: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = KIND_ICONS[submission.kind];

  async function review(status: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    const res = await fetch(
      `/api/projects/${projectId}/submissions/${submission.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote }),
      }
    );
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Lỗi duyệt");
      return;
    }
    onUpdated();
    onClose();
  }

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-[#0a1120]/98 backdrop-blur-sm"
      role="dialog"
      aria-modal
    >
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={16} className="text-sky shrink-0" />
          <span className="text-sm font-medium text-white truncate">
            {SUBMISSION_KIND_LABELS[submission.kind]}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${SUBMISSION_STATUS_TONES[submission.status]}`}
          >
            {SUBMISSION_STATUS_LABELS[submission.status]}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded hover:bg-white/10 text-slate-400"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-[12px]">
        <h3 className="text-base font-semibold text-white leading-snug">{submission.title}</h3>

        <dl className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <dt className="text-slate-500">Người gửi</dt>
            <dd className="text-slate-200">{submission.creatorName || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Thời gian</dt>
            <dd className="text-slate-200">{fmtDateTime(submission.createdAt)}</dd>
          </div>
          {submission.phaseName && (
            <div className="col-span-2">
              <dt className="text-slate-500">Công đoạn</dt>
              <dd className="text-slate-200">{submission.phaseName}</dd>
            </div>
          )}
        </dl>

        {submission.summary && (
          <div>
            <div className="text-[10px] uppercase text-slate-500 mb-1">Tóm tắt</div>
            <p className="text-slate-200">{submission.summary}</p>
          </div>
        )}

        <div>
          <div className="text-[10px] uppercase text-slate-500 mb-1">Chi tiết</div>
          <p className="text-slate-100 whitespace-pre-wrap leading-relaxed bg-white/5 rounded-lg p-2.5 border border-white/10">
            {submission.detail}
          </p>
        </div>

        {submission.reviewedAt && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-2.5">
            <div className="text-[10px] text-slate-500">
              {submission.reviewerName} · {fmtDateTime(submission.reviewedAt)}
            </div>
            {submission.reviewNote && (
              <p className="text-slate-200 mt-1">{submission.reviewNote}</p>
            )}
          </div>
        )}

        {canReview && submission.status === "submitted" && (
          <div className="space-y-2 pt-1 border-t border-white/10">
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={2}
              placeholder="Ghi chú duyệt (tuỳ chọn)"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-slate-100 resize-none"
            />
            {error && <p className="text-rose-300 text-[11px]">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => review("approved")}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <Check size={14} /> Duyệt
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => review("rejected")}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded bg-rose-600/90 text-white hover:bg-rose-500 disabled:opacity-50"
              >
                <X size={14} /> Từ chối
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SubmissionChatCard({
  submission,
  onOpen,
}: {
  submission: ProjectSubmission;
  onOpen: () => void;
}) {
  const Icon = KIND_ICONS[submission.kind];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full mt-1.5 text-left rounded-lg border border-sky/30 bg-sky/10 hover:bg-sky/15 px-2.5 py-2 transition"
    >
      <div className="flex items-center gap-1.5 text-[10px] text-sky-light">
        <Icon size={12} />
        <span>{SUBMISSION_KIND_LABELS[submission.kind]}</span>
        <span className={`ml-auto px-1 rounded ${SUBMISSION_STATUS_TONES[submission.status]}`}>
          {SUBMISSION_STATUS_LABELS[submission.status]}
        </span>
      </div>
      <div className="text-[12px] font-medium text-white mt-1">{submission.title}</div>
      {submission.summary ? (
        <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{submission.summary}</p>
      ) : null}
      <div className="text-[10px] text-sky mt-1.5 inline-flex items-center gap-0.5">
        Xem chi tiết <ChevronRight size={12} />
      </div>
    </button>
  );
}

export function roleCanUpdateProgress(role: ProjectMemberRole | null | undefined): boolean {
  return role === "owner" || role === "manager" || role === "member";
}

export function roleCanSubmit(role: ProjectMemberRole | null | undefined): boolean {
  return roleCanUpdateProgress(role);
}

export function roleCanReview(role: ProjectMemberRole | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

function fmtDate(iso: string | null): string {
  return formatDateVi(iso);
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

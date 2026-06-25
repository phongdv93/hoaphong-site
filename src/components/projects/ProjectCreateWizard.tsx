"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ClipboardList, FileText, Package, Users, Workflow } from "lucide-react";
import type { Customer } from "@/lib/marketing/customer-types";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import { ErpSelect } from "@/components/erp/ErpSelect";
import { ProjectPhasesTab } from "./tabs/ProjectPhasesTab";
import { ProjectMembersTab } from "./tabs/ProjectMembersTab";
import { WizardPhaseSuggestions } from "./WizardPhaseSuggestions";
import { WizardItemsStep } from "./WizardItemsStep";
import type {
  Project,
  ProjectItem,
  ProjectMember,
  ProjectPhase,
} from "@/lib/projects/types";
import type { PiSourceProject } from "@/lib/projects/repository";

type CreationMode = "free" | "pi";

type WorkspacePayload = {
  project: Project;
  phases: ProjectPhase[];
  members: ProjectMember[];
  items: ProjectItem[];
};

const STEPS = [
  { n: 1, title: "Loại dự án", icon: FileText },
  { n: 2, title: "Thông tin chính", icon: ClipboardList },
  { n: 3, title: "Hạng mục / SP", icon: Package },
  { n: 4, title: "Công đoạn", icon: Workflow },
  { n: 5, title: "Thành viên", icon: Users },
] as const;

function useWizardWorkspace(projectId: number | null) {
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!projectId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/workspace`);
      if (res.ok) {
        const ws = await res.json();
        setData({
          project: ws.project,
          phases: ws.phases ?? [],
          members: ws.members ?? [],
          items: ws.items ?? [],
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, reload };
}

export function ProjectCreateWizard({
  customers,
  onCreated,
  onCancel,
}: {
  customers: Customer[];
  onCreated?: (projectId: number) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [creationMode, setCreationMode] = useState<CreationMode | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sourcePiId, setSourcePiId] = useState<number | null>(null);
  const [piSources, setPiSources] = useState<PiSourceProject[]>([]);
  const [piSourcesLoading, setPiSourcesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const itemsCopiedRef = useRef(false);

  const { data: workspace, loading: wsLoading, reload } = useWizardWorkspace(projectId);

  useEffect(() => {
    if (creationMode !== "pi" || step !== 2) return;
    setPiSourcesLoading(true);
    fetch("/api/projects?piSources=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setPiSources(Array.isArray(list) ? list : []))
      .catch(() => setPiSources([]))
      .finally(() => setPiSourcesLoading(false));
  }, [creationMode, step]);

  function pickMode(mode: CreationMode) {
    setCreationMode(mode);
    setError("");
    setStep(2);
  }

  function selectPiSource(pi: PiSourceProject) {
    if (sourcePiId === pi.id) {
      setSourcePiId(null);
      return;
    }
    setSourcePiId(pi.id);
    setName(pi.name);
    setCustomerId(pi.customerId);
    setStartDate(pi.startDate ?? "");
    setExpectedEndDate(pi.expectedEndDate ?? "");
    setAddress(pi.address);
    setError("");
  }

  async function ensureProject(): Promise<number | null> {
    if (projectId) return projectId;
    if (!name.trim()) {
      setError("Tên dự án bắt buộc");
      return null;
    }
    if (creationMode === "pi" && !code.trim()) {
      setError("Mã đơn hàng / PI bắt buộc");
      return null;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creationMode: creationMode ?? "free",
          name: name.trim(),
          code: code.trim() || undefined,
          customerId: creationMode === "pi" ? customerId : null,
          startDate: startDate || null,
          expectedEndDate: expectedEndDate || null,
          address,
          seedPhases: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không tạo được dự án");
        return null;
      }
      setProjectId(data.id);
      return data.id as number;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi mạng");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function copyItemsFromPi(targetId: number) {
    if (!sourcePiId || itemsCopiedRef.current) return;
    const pi = piSources.find((p) => p.id === sourcePiId);
    if (!pi?.itemCount) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${targetId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyFromProjectId: sourcePiId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Không sao chép được hạng mục");
        return;
      }
      itemsCopiedRef.current = true;
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function continueFromStep2() {
    const id = await ensureProject();
    if (!id) return;
    await copyItemsFromPi(id);
    setStep(3);
  }

  async function goToStep(target: number) {
    setError("");
    if (target > 2 && !projectId) {
      const id = await ensureProject();
      if (!id) return;
    }
    if (target > 5) {
      if (projectId) onCreated?.(projectId);
      return;
    }
    setStep(target);
  }

  function skipOrLater() {
    if (step < 5) setStep(step + 1);
    else if (projectId) onCreated?.(projectId);
  }

  const step2Ready =
    Boolean(name.trim()) && (creationMode !== "pi" || Boolean(code.trim()));

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-4 max-w-none">
      <nav className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div
              key={s.n}
              className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] ${
                active
                  ? "bg-sky/20 text-sky-light"
                  : done
                    ? "text-slate-400"
                    : "text-slate-600"
              }`}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{s.n}. {s.title}</span>
              <span className="sm:hidden">{s.n}</span>
            </div>
          );
        })}
      </nav>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">Chọn loại dự án — bấm để tiếp tục.</p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => pickMode("free")}
              className="text-left rounded-xl border border-white/15 hover:border-sky/50 hover:bg-sky/10 p-4 transition-colors"
            >
              <p className="font-semibold text-white text-sm">Dự án tự do</p>
              <p className="text-xs text-slate-400 mt-1">
                Mã tự sinh nếu để trống. Phù hợp dự án nội bộ, khảo sát.
              </p>
            </button>
            <button
              type="button"
              onClick={() => pickMode("pi")}
              className="text-left rounded-xl border border-white/15 hover:border-sky/50 hover:bg-sky/10 p-4 transition-colors"
            >
              <p className="font-semibold text-white text-sm">Theo đơn hàng / PI</p>
              <p className="text-xs text-slate-400 mt-1">
                Gắn mã PI, chọn khách hàng. Có thể chọn PI có sẵn để lấy hạng mục.
              </p>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {creationMode === "pi" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Chọn PI / đơn hàng có sẵn (tùy chọn)</p>
              {piSourcesLoading ? (
                <p className="text-xs text-slate-500 py-2">Đang tải danh sách PI…</p>
              ) : piSources.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 px-3 rounded-lg border border-dashed border-white/10">
                  Không có PI / đơn hàng nào trong công ty.
                </p>
              ) : (
                <div className="grid gap-2 max-h-40 overflow-y-auto pr-1">
                  {piSources.map((pi) => {
                    const selected = sourcePiId === pi.id;
                    return (
                      <button
                        key={pi.id}
                        type="button"
                        onClick={() => selectPiSource(pi)}
                        className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                          selected
                            ? "border-sky/60 bg-sky/15"
                            : "border-white/15 hover:border-sky/40 hover:bg-white/5"
                        }`}
                      >
                        <span className="font-mono text-xs text-sky-light">{pi.code}</span>
                        <span className="text-sm text-white ml-2">{pi.name}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {pi.customerName ? `${pi.customerName} · ` : ""}
                          {pi.itemCount} hạng mục
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {sourcePiId != null && (
                <p className="text-[10px] text-sky-light/80">
                  Đã chọn mẫu — hạng mục sẽ được sao chép khi bấm Tiếp tục (nếu PI có hạng mục).
                </p>
              )}
            </div>
          )}

          <Field label="Tên dự án *">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="VD: Biệt thự Vinhomes Q9"
            />
          </Field>
          <Field label={creationMode === "pi" ? "Mã đơn hàng / PI *" : "Mã dự án (tùy chọn)"}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input-field font-mono"
              placeholder={creationMode === "pi" ? "PI-2026-0142" : "Để trống → tự sinh DA-..."}
            />
          </Field>
          {creationMode === "pi" && (
            <Field label="Khách hàng">
              <ErpSelect
                value={customerId}
                onChange={(v) => setCustomerId(v === "" ? null : v)}
                options={customerOptions}
                placeholder="— Chọn khách hàng —"
                className="w-full"
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày bắt đầu">
              <ErpDateInput value={startDate} onChange={setStartDate} className="text-sm" />
            </Field>
            <Field label="Ngày kết thúc dự kiến">
              <ErpDateInput value={expectedEndDate} onChange={setExpectedEndDate} className="text-sm" />
            </Field>
          </div>
          <Field label="Địa chỉ giao hàng / công trình">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-field"
              placeholder="Địa điểm lắp đặt, giao hàng"
            />
          </Field>
        </div>
      )}

      {step === 3 && projectId && workspace && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Nhập hoặc dán hạng mục — gõ tên để tìm danh mục SP, hoặc thêm mới.
          </p>
          <WizardItemsStep
            projectId={projectId}
            items={workspace.items}
            onChanged={() => void reload()}
          />
        </div>
      )}

      {step === 3 && projectId && wsLoading && !workspace && (
        <p className="text-sm text-slate-400 py-6 text-center">Đang tải…</p>
      )}

      {step === 4 && projectId && workspace && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Giống tab Công đoạn — sửa tên, thời gian, xóa, gán theo hạng mục.
          </p>
          <WizardPhaseSuggestions
            projectId={projectId}
            creationMode={creationMode ?? "free"}
            phaseCount={workspace.phases.length}
            hasItems={workspace.items.length > 0}
            onApplied={() => void reload()}
          />
          <ProjectPhasesTab
            project={workspace.project}
            phases={workspace.phases}
            members={workspace.members}
            canEdit
            onChanged={() => void reload()}
          />
        </div>
      )}

      {step === 5 && projectId && workspace && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Giống tab Thành viên — có thể bỏ qua và mời sau.
          </p>
          <ProjectMembersTab
            project={workspace.project}
            members={workspace.members}
            canEdit
            onChanged={() => void reload()}
          />
        </div>
      )}

      {error && <div className="text-sm text-rose-400">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-slate-300 hover:bg-white/10"
        >
          Hủy
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-slate-300 hover:bg-white/5"
            >
              <ChevronLeft size={14} /> Quay lại
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={busy || !step2Ready}
              onClick={() => void continueFromStep2()}
              className="bg-sky text-white px-4 py-1.5 rounded-lg text-xs hover:bg-sky-light disabled:opacity-50"
            >
              {busy ? "Đang xử lý…" : "Tiếp tục"}
            </button>
          )}
          {step >= 3 && (
            <>
              <button
                type="button"
                onClick={skipOrLater}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={skipOrLater}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5"
              >
                Cập nhật sau
              </button>
            </>
          )}
          {step >= 3 && step < 5 && (
            <button
              type="button"
              disabled={busy || wsLoading}
              onClick={() => void goToStep(step + 1)}
              className="bg-sky text-white px-4 py-1.5 rounded-lg text-xs hover:bg-sky-light disabled:opacity-50"
            >
              Tiếp tục
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => projectId && onCreated?.(projectId)}
              className="bg-sky text-white px-4 py-1.5 rounded-lg text-xs hover:bg-sky-light disabled:opacity-50"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-300/70 mb-1">{label}</span>
      {children}
    </label>
  );
}

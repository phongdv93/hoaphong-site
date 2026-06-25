"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, FileText, Package, Users, Workflow } from "lucide-react";
import type { Customer } from "@/lib/marketing/customer-types";
import { DEFAULT_PHASES, MEMBER_ROLE_LABELS } from "@/lib/projects/constants";
import type { CompanyMember, PhaseKind, ProjectMemberRole } from "@/lib/projects/types";
import { AppSelect } from "@/components/ui/AppSelect";
import { ErpDateInput } from "@/components/erp/ErpDateInput";

type CreationMode = "free" | "pi";

type DraftItem = { id: string; name: string; quantity: string; unit: string };
type DraftMember = { userId: number; role: ProjectMemberRole; userName: string };

const STEPS = [
  { n: 1, title: "Loại dự án", icon: FileText },
  { n: 2, title: "Thông tin chính", icon: ClipboardList },
  { n: 3, title: "Hạng mục / SP", icon: Package },
  { n: 4, title: "Công đoạn", icon: Workflow },
  { n: 5, title: "Thành viên", icon: Users },
] as const;

function uid() {
  return crypto.randomUUID();
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
  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    { id: uid(), name: "", quantity: "1", unit: "" },
  ]);
  const [selectedPhaseKinds, setSelectedPhaseKinds] = useState<Set<PhaseKind>>(
    () => new Set(DEFAULT_PHASES.map((p) => p.kind))
  );
  const [draftMembers, setDraftMembers] = useState<DraftMember[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step < 5) return;
    fetch("/api/companies/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((active) => {
        if (!active?.companyId) return;
        setCompanyId(active.companyId);
        return fetch(`/api/companies/${active.companyId}/members`).then((r) =>
          r.ok ? r.json() : []
        );
      })
      .then((rows) => {
        if (Array.isArray(rows)) setCompanyMembers(rows.filter((c: CompanyMember) => c.status === "active"));
      })
      .catch(() => setCompanyMembers([]));
  }, [step]);

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

  async function saveItems(id: number) {
    const rows = draftItems
      .map((r) => ({
        name: r.name.trim(),
        quantity: Number(r.quantity.replace(/[^\d.,]/g, "").replace(",", ".")) || 1,
        unit: r.unit.trim() || undefined,
      }))
      .filter((r) => r.name);
    if (!rows.length) return;
    await fetch(`/api/projects/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
  }

  async function savePhases(id: number) {
    const selected = DEFAULT_PHASES.filter((p) => selectedPhaseKinds.has(p.kind));
    for (let i = 0; i < selected.length; i++) {
      const p = selected[i];
      await fetch(`/api/projects/${id}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: p.kind, name: p.name, sortOrder: (i + 1) * 10 }),
      });
    }
  }

  async function saveMembers(id: number) {
    for (const m of draftMembers) {
      await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: m.userId, role: m.role }),
      });
    }
  }

  async function finishWizard() {
    const id = projectId ?? (await ensureProject());
    if (!id) return;
    onCreated?.(id);
  }

  async function goNext(saveCurrent: boolean) {
    setError("");
    if (step === 1) {
      if (!creationMode) {
        setError("Chọn loại dự án");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const id = await ensureProject();
      if (!id) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      if (saveCurrent) {
        const id = projectId ?? (await ensureProject());
        if (!id) return;
        setBusy(true);
        try {
          await saveItems(id);
        } finally {
          setBusy(false);
        }
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      if (saveCurrent) {
        const id = projectId ?? (await ensureProject());
        if (!id) return;
        setBusy(true);
        try {
          await savePhases(id);
        } finally {
          setBusy(false);
        }
      }
      setStep(5);
      return;
    }
    if (step === 5) {
      if (saveCurrent) {
        const id = projectId ?? (await ensureProject());
        if (!id) return;
        setBusy(true);
        try {
          await saveMembers(id);
        } finally {
          setBusy(false);
        }
      }
      await finishWizard();
    }
  }

  function skipStep() {
    void goNext(false);
  }

  const memberCandidates = companyMembers.filter(
    (c) => !draftMembers.some((m) => m.userId === c.userId)
  );

  return (
    <div className="space-y-5 max-w-none">
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
          <p className="text-sm text-slate-300">Bạn muốn tạo dự án theo cách nào?</p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setCreationMode("free")}
              className={`text-left rounded-xl border p-4 transition-colors ${
                creationMode === "free"
                  ? "border-sky bg-sky/10"
                  : "border-white/15 hover:border-white/25"
              }`}
            >
              <p className="font-semibold text-white text-sm">Dự án tự do</p>
              <p className="text-xs text-slate-400 mt-1">
                Không gắn PI — mã dự án tự sinh nếu để trống. Phù hợp dự án nội bộ, khảo sát.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("pi")}
              className={`text-left rounded-xl border p-4 transition-colors ${
                creationMode === "pi"
                  ? "border-sky bg-sky/10"
                  : "border-white/15 hover:border-white/25"
              }`}
            >
              <p className="font-semibold text-white text-sm">Theo đơn hàng / PI</p>
              <p className="text-xs text-slate-400 mt-1">
                Gắn mã PI hoặc hợp đồng, chọn khách hàng. Phù hợp đơn xuất khẩu, hợp đồng thương mại.
              </p>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Thông tin có thể chỉnh lại sau trong chi tiết dự án.
          </p>
          <Field label="Tên dự án *">
            <input
              required
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
              <AppSelect
                value={String(customerId ?? "")}
                onChange={(v) => setCustomerId(v ? Number(v) : null)}
                className="input-field w-full text-left flex items-center justify-between"
                options={[
                  { value: "", label: "— Chọn khách hàng —" },
                  ...customers.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
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

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Thêm hạng mục hoặc sản phẩm — có thể bỏ qua và nhập sau trong tab Hạng mục.
          </p>
          <div className="space-y-2">
            {draftItems.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-[1fr_4rem_4rem_auto] gap-2 items-center">
                <input
                  value={row.name}
                  onChange={(e) =>
                    setDraftItems((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
                    )
                  }
                  className="input-field text-sm"
                  placeholder={`Hạng mục ${idx + 1}`}
                />
                <input
                  value={row.quantity}
                  onChange={(e) =>
                    setDraftItems((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, quantity: e.target.value } : r))
                    )
                  }
                  className="input-field text-sm text-center tabular-nums"
                  placeholder="SL"
                />
                <input
                  value={row.unit}
                  onChange={(e) =>
                    setDraftItems((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, unit: e.target.value } : r))
                    )
                  }
                  className="input-field text-sm"
                  placeholder="ĐVT"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraftItems((prev) =>
                      prev.length <= 1 ? prev : prev.filter((r) => r.id !== row.id)
                    )
                  }
                  className="text-xs text-slate-500 hover:text-rose-400 px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setDraftItems((prev) => [...prev, { id: uid(), name: "", quantity: "1", unit: "" }])
            }
            className="text-xs text-sky hover:underline"
          >
            + Thêm dòng
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Chọn công đoạn mặc định — có thể bỏ qua và thêm sau trong tab Công đoạn.
          </p>
          <div className="space-y-2">
            {DEFAULT_PHASES.map((p) => (
              <label
                key={p.kind}
                className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPhaseKinds.has(p.kind)}
                  onChange={(e) => {
                    setSelectedPhaseKinds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(p.kind);
                      else next.delete(p.kind);
                      return next;
                    });
                  }}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Mời thêm thành viên (ngoài bạn — chủ trì). Có thể bỏ qua và thêm sau.
          </p>
          {draftMembers.length > 0 && (
            <ul className="space-y-1">
              {draftMembers.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between text-sm bg-white/5 rounded px-2 py-1.5"
                >
                  <span>{m.userName}</span>
                  <span className="text-xs text-slate-400">{MEMBER_ROLE_LABELS[m.role]}</span>
                </li>
              ))}
            </ul>
          )}
          {memberCandidates.length === 0 ? (
            <p className="text-sm text-slate-500">Không còn thành viên công ty để thêm.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {memberCandidates.slice(0, 12).map((c) => (
                <div key={c.userId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{c.userName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftMembers((prev) => [
                        ...prev,
                        { userId: c.userId, role: "member", userName: c.userName || c.userEmail || `#${c.userId}` },
                      ])
                    }
                    className="text-xs text-sky hover:underline shrink-0"
                  >
                    Thêm
                  </button>
                </div>
              ))}
            </div>
          )}
          {companyId && memberCandidates.length > 0 && (
            <p className="text-[10px] text-slate-600">
              Vai trò chi tiết chỉnh trong tab Thành viên sau khi tạo.
            </p>
          )}
        </div>
      )}

      {error && <div className="text-sm text-rose-400">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : undefined)}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-slate-300 hover:bg-white/10"
        >
          Hủy
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 text-xs text-slate-300 hover:bg-white/5"
            >
              <ChevronLeft size={14} /> Quay lại
            </button>
          )}
          {step >= 3 && (
            <>
              <button
                type="button"
                onClick={skipStep}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={skipStep}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5"
              >
                Cập nhật sau
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void goNext(step >= 3)}
            className="inline-flex items-center gap-1 bg-sky text-white px-4 py-1.5 rounded-lg text-xs hover:bg-sky-light disabled:opacity-50"
          >
            {busy ? "Đang lưu…" : step === 5 ? "Hoàn tất" : "Tiếp tục"}
            {step < 5 && <ChevronRight size={14} />}
          </button>
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

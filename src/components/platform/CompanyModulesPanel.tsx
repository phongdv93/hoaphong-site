"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Globe,
  Layers,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { PlatformModule } from "@/lib/platform/catalog";
import type { CompanyModuleRow } from "@/lib/platform/access";
import { isCompanyModuleActive } from "@/lib/platform/module-status";
import { dispatchCompanyModulesChanged } from "@/lib/erp/events";

const MODULE_ICONS: Record<string, LucideIcon> = {
  "du-an": FolderKanban,
  "san-pham": Layers,
  kho: Package,
  marketing: ShoppingCart,
  xnk: Globe,
  "ke-toan": Calculator,
  hr: Users,
  "quan-tri": Settings,
};

interface Row {
  module: PlatformModule;
  sub: CompanyModuleRow | null;
  active: boolean;
  draftEnabled: boolean;
  draftStartedAt: string;
  draftExpiresAt: string;
  draftFee: string;
  draftNotes: string;
  saving: boolean;
  expanded: boolean;
  dirty: boolean;
}

function buildRow(mod: PlatformModule, sub: CompanyModuleRow | null): Row {
  const active = isCompanyModuleActive(
    sub ? { enabled: sub.enabled, expiresAt: sub.expiresAt } : null,
    mod
  );
  return {
    module: mod,
    sub,
    active,
    draftEnabled: sub?.enabled ?? mod.alwaysOn ?? false,
    draftStartedAt: sub?.startedAt ?? "",
    draftExpiresAt: sub?.expiresAt ?? "",
    draftFee: sub
      ? new Intl.NumberFormat("vi-VN").format(sub.monthlyFee)
      : new Intl.NumberFormat("vi-VN").format(mod.suggestedMonthlyFee),
    draftNotes: sub?.notes ?? "",
    saving: false,
    expanded: false,
    dirty: false,
  };
}

function statusLabel(r: Row): { text: string; className: string } {
  if (r.module.alwaysOn) {
    return { text: "Bắt buộc", className: "bg-zinc-500/20 text-zinc-200" };
  }
  if (r.active) {
    return { text: "Đang dùng", className: "bg-emerald-500/20 text-emerald-200" };
  }
  if (r.sub?.enabled && r.draftExpiresAt && r.draftExpiresAt < new Date().toISOString().slice(0, 10)) {
    return { text: "Hết hạn", className: "bg-amber-500/20 text-amber-200" };
  }
  if (r.sub) {
    return { text: "Đã tắt", className: "bg-rose-500/15 text-rose-200" };
  }
  if (r.module.defaultForNewCompany) {
    return { text: "Gói mặc định", className: "bg-sky/20 text-sky-light" };
  }
  return { text: "Chưa kích hoạt", className: "bg-white/5 text-slate-400" };
}

export function CompanyModulesPanel({ companyId }: { companyId: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/platform/companies/${companyId}/modules`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tải được gói module");
      setRows([]);
      return;
    }
    const data: {
      catalog: PlatformModule[];
      subscriptions: CompanyModuleRow[];
    } = await res.json();
    setRows(
      data.catalog.map((m) =>
        buildRow(m, data.subscriptions.find((s) => s.moduleId === m.id) ?? null)
      )
    );
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    if (!rows) return { active: 0, revenue: 0 };
    let active = 0;
    let revenue = 0;
    for (const r of rows) {
      if (
        isCompanyModuleActive(
          { enabled: r.draftEnabled, expiresAt: r.draftExpiresAt || null },
          r.module
        )
      ) {
        active += 1;
        revenue += Number(r.draftFee.replace(/[^\d]/g, "")) || 0;
      }
    }
    return { active, revenue };
  }, [rows]);

  async function persist(
    idx: number,
    patch: {
      enabled?: boolean;
      startedAt?: string | null;
      expiresAt?: string | null;
      monthlyFee?: number;
      notes?: string;
    }
  ) {
    if (!rows) return;
    const r = rows[idx];
    const updated = [...rows];
    updated[idx] = { ...r, saving: true };
    setRows(updated);

    const fee = Number(r.draftFee.replace(/[^\d]/g, "")) || 0;
    const res = await fetch(`/api/platform/companies/${companyId}/modules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId: r.module.id,
        ...patch,
        monthlyFee: patch.monthlyFee ?? fee,
        notes: patch.notes ?? r.draftNotes,
      }),
    });

    if (res.ok) {
      dispatchCompanyModulesChanged(companyId);
      setToast(`${r.module.name}: đã lưu`);
      setTimeout(() => setToast(null), 2500);
      await load();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Lưu thất bại");
      const u = [...updated];
      u[idx] = { ...r, saving: false };
      setRows(u);
    }
  }

  async function toggleModule(idx: number, enabled: boolean) {
    if (!rows) return;
    const r = rows[idx];
    if (r.module.alwaysOn) return;

    const u = [...rows];
    const today = new Date().toISOString().slice(0, 10);
    u[idx] = {
      ...r,
      draftEnabled: enabled,
      draftStartedAt: enabled && !r.draftStartedAt ? today : r.draftStartedAt,
    };
    setRows(u);

    await persist(idx, {
      enabled,
      startedAt: enabled ? u[idx].draftStartedAt || today : u[idx].draftStartedAt || null,
      expiresAt: u[idx].draftExpiresAt || null,
    });
  }

  function patchDraft(idx: number, patch: Partial<Row>) {
    if (!rows) return;
    const u = [...rows];
    u[idx] = { ...u[idx], ...patch, dirty: true };
    setRows(u);
  }

  if (rows === null) {
    return <div className="text-sm text-slate-300/60">Đang tải gói module…</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Module đang dùng" value={String(summary.active)} />
        <SummaryCard
          label="Doanh thu gói / tháng"
          value={`${new Intl.NumberFormat("vi-VN").format(summary.revenue)} ₫`}
        />
        <SummaryCard
          label="Tổng trên catalog"
          value={`${rows.length} module`}
          hint="Bật = công ty thấy menu ERP tương ứng"
        />
      </div>

      <p className="text-xs text-slate-400 max-w-2xl">
        Gạt công tắc để bật/tắt — lưu ngay vào database. Ngày hết hạn để trống = không giới hạn.
        Module <span className="text-slate-300">bắt buộc</span> luôn bật cho mọi công ty.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r, i) => {
          const Icon = MODULE_ICONS[r.module.id] ?? Package;
          const st = statusLabel(r);
          return (
            <article
              key={r.module.id}
              className={`rounded-xl border p-4 transition-colors ${
                r.active
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    r.active ? "bg-emerald-500/20" : "bg-white/10"
                  }`}
                >
                  <Icon size={20} className="text-sky-light" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">{r.module.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.className}`}>
                      {st.text}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {r.module.description}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">{r.module.id}</p>
                </div>
                <Toggle
                  checked={r.draftEnabled || r.module.alwaysOn}
                  disabled={r.module.alwaysOn || r.saving}
                  onChange={(on) => void toggleModule(i, on)}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400 tabular-nums">
                  Gợi ý:{" "}
                  {new Intl.NumberFormat("vi-VN").format(r.module.suggestedMonthlyFee)} ₫/tháng
                </span>
                <button
                  type="button"
                  onClick={() => patchDraft(i, { expanded: !r.expanded })}
                  className="text-sky-light hover:underline inline-flex items-center gap-1"
                >
                  {r.expanded ? (
                    <>
                      Thu gọn <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      Ngày & phí <ChevronDown size={12} />
                    </>
                  )}
                </button>
              </div>

              {r.expanded && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Bắt đầu">
                      <input
                        type="date"
                        value={r.draftStartedAt}
                        onChange={(e) =>
                          patchDraft(i, { draftStartedAt: e.target.value })
                        }
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Hết hạn (trống = vô thời hạn)">
                      <input
                        type="date"
                        value={r.draftExpiresAt}
                        onChange={(e) =>
                          patchDraft(i, { draftExpiresAt: e.target.value })
                        }
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field label="Phí thuê / tháng (₫)">
                    <input
                      value={r.draftFee}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        patchDraft(i, {
                          draftFee: raw
                            ? new Intl.NumberFormat("vi-VN").format(Number(raw))
                            : "",
                        });
                      }}
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Ghi chú nội bộ">
                    <input
                      value={r.draftNotes}
                      onChange={(e) => patchDraft(i, { draftNotes: e.target.value })}
                      placeholder="Hợp đồng, PO, lý do bật thử…"
                      className={inputCls}
                    />
                  </Field>
                  <button
                    type="button"
                    disabled={r.saving}
                    onClick={() =>
                      void persist(i, {
                        enabled: r.draftEnabled,
                        startedAt: r.draftStartedAt || null,
                        expiresAt: r.draftExpiresAt || null,
                      })
                    }
                    className="text-xs bg-sky text-white px-3 py-1.5 rounded-lg hover:bg-sky-light disabled:opacity-50"
                  >
                    {r.saving ? "Đang lưu…" : "Lưu ngày & phí"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-emerald-500" : "bg-white/20"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-white mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full text-xs bg-[#0b1630] border border-white/15 rounded-lg px-2 py-1.5 text-slate-200";

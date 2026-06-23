"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Plus, Check } from "lucide-react";
import type { CompanySummary } from "@/lib/projects/types";
import { companyPublicCode } from "@/lib/projects/company-code";
import { COMPANY_CHANGED_EVENT, dispatchCompanyChanged } from "@/lib/erp/events";

/** Hiển thị công ty đang active + dropdown switch. Dùng trong ErpShell sidebar. */
export function CompanySwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function load() {
    try {
      const [listRes, activeRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/companies/active"),
      ]);
      if (listRes.ok) setCompanies(await listRes.json());
      if (activeRes.ok) {
        const j = await activeRes.json();
        setActiveId(j.companyId ?? null);
      }
    } catch {
      setCompanies([]);
    }
  }

  useEffect(() => {
    void load();
  }, [pathname]);

  useEffect(() => {
    const onCompanyChanged = () => void load();
    window.addEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
    return () => window.removeEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
  }, []);

  async function switchTo(id: number) {
    setSwitching(true);
    try {
      const res = await fetch("/api/companies/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: id }),
      });
      if (res.ok) {
        setActiveId(id);
        setOpen(false);
        dispatchCompanyChanged(id);
        router.refresh();
      }
    } finally {
      setSwitching(false);
    }
  }

  const active = companies?.find((c) => c.id === activeId);
  const hasCompanies = (companies?.length ?? 0) > 0;

  return (
    <div
      className={`border-b border-white/10 ${
        collapsed ? "px-2 py-2 flex justify-center" : "px-3 py-2"
      }`}
    >
      {!collapsed && (
        <div className="text-[10px] uppercase tracking-wide text-slate-muted mb-1">
          Công ty
        </div>
      )}
      {!hasCompanies ? (
        <Link
          href="/erp/cong-ty/new"
          className={`flex items-center gap-2 rounded bg-white/5 hover:bg-white/10 text-xs ${
            collapsed ? "p-2 justify-center" : "px-2 py-2"
          }`}
          title="Tạo công ty đầu tiên"
        >
          <Plus size={14} />
          {!collapsed && "Tạo công ty đầu tiên"}
        </Link>
      ) : (
        <div className={`relative ${collapsed ? "w-full flex justify-center" : ""}`}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={switching}
            className={`flex items-center gap-2 rounded bg-white/5 hover:bg-white/10 text-xs text-left ${
              collapsed ? "p-2 justify-center w-10 h-10" : "w-full px-2 py-2"
            }`}
            title={active ? `${active.name} · MST ${companyPublicCode(active)}` : "Chọn công ty"}
          >
            <Building2 size={14} className="shrink-0 text-sky-light" />
            {!collapsed && (
              <span className="truncate flex-1 font-mono tabular-nums">
                {active ? companyPublicCode(active) : "Chọn công ty"}
              </span>
            )}
          </button>
          {open && companies && (
            <div
              className={`absolute z-30 bg-navy border border-white/10 rounded-lg shadow-lg max-h-72 overflow-auto min-w-[220px] ${
                collapsed ? "left-full top-0 ml-2 w-64" : "left-0 right-0 mt-1"
              }`}
            >
              {companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => switchTo(c.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-left hover:bg-white/10"
                >
                  <Check
                    size={12}
                    className={c.id === activeId ? "text-emerald-300" : "opacity-0"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono tabular-nums truncate">{companyPublicCode(c)}</div>
                    <div className="text-[10px] text-slate-muted truncate" title={c.name}>
                      {c.name}
                    </div>
                    <div className="text-[10px] text-slate-muted truncate">
                      {c.projectCount} dự án · {c.memberCount} thành viên · {c.myRole}
                    </div>
                  </div>
                </button>
              ))}
              <div className="border-t border-white/10">
                <Link
                  href="/erp/cong-ty/new"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-2 py-2 text-xs text-sky-light hover:bg-white/10"
                >
                  <Plus size={12} /> Thêm công ty mới
                </Link>
                <Link
                  href="/erp/cong-ty"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-2 py-2 text-xs text-slate-muted hover:bg-white/10"
                >
                  Quản lý tất cả công ty
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

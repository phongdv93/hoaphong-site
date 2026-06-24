"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Puzzle,
  Users,
} from "lucide-react";
import { CompanyPortalLink } from "@/components/erp/CompanyPortalLink";
import { companyWorkspacePath } from "@/lib/projects/company-code";
import { CompanyModulesPanel } from "./CompanyModulesPanel";

interface CompanyInfo {
  id: number;
  code: string;
  subdomain?: string;
  name: string;
  email: string;
  phone: string;
  taxCode: string;
  status: string;
  memberCount?: number;
}

export function PlatformCompanyHub({ companyId }: { companyId: number }) {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [stats, setStats] = useState<{ activeModules: number; monthlyRevenue: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [cRes, listRes] = await Promise.all([
      fetch(`/api/companies/${companyId}`),
      fetch("/api/platform/companies"),
    ]);
    if (!cRes.ok) {
      const j = await cRes.json().catch(() => ({}));
      setError(j.error || "Không tải được công ty");
      return;
    }
    const cData = await cRes.json();
    setCompany(cData.company);
    if (listRes.ok) {
      const list: Array<{
        id: number;
        activeModules: number;
        monthlyRevenue: number;
      }> = await listRes.json();
      const row = list.find((r) => r.id === companyId);
      if (row) {
        setStats({
          activeModules: row.activeModules,
          monthlyRevenue: row.monthlyRevenue,
        });
      }
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
        {error}
        <Link
          href="/erp/platform/cong-ty"
          className="block mt-2 text-sky-light underline"
        >
          Về danh sách công ty
        </Link>
      </div>
    );
  }

  if (!company) {
    return <div className="text-sm text-slate-300/60">Đang tải…</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <Link
          href="/erp/platform/cong-ty"
          className="inline-flex items-center gap-1 hover:text-white"
        >
          <ArrowLeft size={14} /> Công ty & gói module
        </Link>
        <span>/</span>
        <span className="text-white font-medium truncate">{company.name}</span>
      </nav>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-sky/20 flex items-center justify-center shrink-0">
              <Building2 className="text-sky-light" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{company.name}</h2>
              <p className="text-sm text-slate-400 font-mono mt-0.5">{company.code}</p>
              <div className="mt-2 max-w-md">
                <CompanyPortalLink
                  subdomain={company.subdomain ?? company.code}
                  companyName={company.name}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                {company.taxCode && <span>MST: {company.taxCode}</span>}
                {company.email && <span>{company.email}</span>}
                {company.phone && <span>{company.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/erp/cong-ty/${companyId}`}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5"
            >
              <Users size={14} /> Thành viên công ty
            </Link>
            <Link
              href={companyWorkspacePath(company)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5"
            >
              <ExternalLink size={14} /> Không gian ERP
            </Link>
          </div>
        </div>
        {stats && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500 text-xs">Module đang chạy</span>
              <div className="font-semibold text-emerald-300 tabular-nums">
                {stats.activeModules}
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Doanh thu gói / tháng</span>
              <div className="font-semibold text-white tabular-nums">
                {new Intl.NumberFormat("vi-VN").format(stats.monthlyRevenue)} ₫
              </div>
            </div>
          </div>
        )}
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Puzzle size={18} className="text-sky-light" />
          <h3 className="text-lg font-semibold text-white">Gói module ERP</h3>
        </div>
        <CompanyModulesPanel companyId={companyId} />
      </section>
    </div>
  );
}

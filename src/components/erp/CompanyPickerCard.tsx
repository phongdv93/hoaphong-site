"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, FolderKanban, Users, ArrowRight } from "lucide-react";
import {
  COMPANY_ROLE_LABELS,
  COMPANY_STATUS_LABELS,
} from "@/lib/projects/constants";
import type { CompanySummary } from "@/lib/projects/types";
import { companyPublicCode, companyWorkspacePath } from "@/lib/projects/company-code";
import { dispatchCompanyChanged } from "@/lib/erp/events";

/** Card chọn công ty — click sẽ set cookie active company và đi vào dashboard công ty. */
export function CompanyPickerCard({ company }: { company: CompanySummary }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function enter() {
    setLoading(true);
    const res = await fetch("/api/companies/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: company.id }),
    });
    if (res.ok) {
      dispatchCompanyChanged(company.id);
      router.refresh();
    }
    router.push(companyWorkspacePath(company));
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={enter}
      className="text-left erp-card p-4 hover:border-sky/40 hover:bg-white/[0.06] transition disabled:opacity-60"
    >
      <div className="flex items-start gap-3">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt=""
            className="w-10 h-10 rounded object-contain border border-navy/10"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-sky-light">
            <Building2 size={20} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{company.name}</div>
          <div className="text-xs text-slate-400 truncate font-mono tabular-nums">
            MST {companyPublicCode(company)} · {COMPANY_STATUS_LABELS[company.status]}
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded bg-white/10 text-slate-300">
          {COMPANY_ROLE_LABELS[company.myRole]}
        </span>
      </div>
      <div className="flex gap-4 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <FolderKanban size={12} /> {company.projectCount} dự án
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {company.memberCount} thành viên
        </span>
      </div>
      <div className="text-xs text-sky-light mt-3 flex items-center justify-end gap-1">
        {loading ? "Đang vào…" : "Vào không gian làm việc"} <ArrowRight size={12} />
      </div>
    </button>
  );
}

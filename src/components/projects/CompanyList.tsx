"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, Users, FolderKanban } from "lucide-react";
import { dispatchCompanyChanged } from "@/lib/erp/events";
import { useOnCompanyChanged } from "@/lib/erp/use-on-company-changed";
import {
  COMPANY_ROLE_LABELS,
  COMPANY_STATUS_LABELS,
} from "@/lib/projects/constants";
import { CompanyPortalLink } from "@/components/erp/CompanyPortalLink";
import type { CompanySummary } from "@/lib/projects/types";
import { companyWorkspacePath } from "@/lib/projects/company-code";

export function CompanyList() {
  const router = useRouter();
  const [items, setItems] = useState<CompanySummary[] | null>(null);
  const [enteringId, setEnteringId] = useState<number | null>(null);

  function load() {
    fetch("/api/companies")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
  }, []);

  useOnCompanyChanged(load);

  async function enterCompany(c: CompanySummary) {
    setEnteringId(c.id);
    try {
      const res = await fetch("/api/companies/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: c.id }),
      });
      if (res.ok) {
        dispatchCompanyChanged(c.id);
        router.refresh();
        router.push(companyWorkspacePath(c));
      }
    } finally {
      setEnteringId(null);
    }
  }

  if (items === null) {
    return <div className="text-sm text-slate-200/60">Đang tải…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="erp-card rounded-xl p-8 text-center">
        <Building2 size={42} className="mx-auto text-slate-600 mb-3" />
        <p className="text-slate-200/80 mb-4">
          Bạn chưa thuộc công ty nào. Hãy tạo công ty đầu tiên để bắt đầu quản lý dự án.
        </p>
        <Link
          href="/erp/cong-ty/new"
          className="inline-flex items-center gap-2 bg-sky text-white px-4 py-2 rounded-lg hover:bg-sky-light"
        >
          <Plus size={16} /> Tạo công ty
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/erp/cong-ty/new"
          className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy/90 text-sm"
        >
          <Plus size={16} /> Công ty mới
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((c) => (
          <div
            key={c.id}
            className="erp-card-hover rounded-xl p-4 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => void enterCompany(c)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void enterCompany(c);
              }
            }}
          >
            <div className="flex items-start gap-3">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logoUrl}
                  alt=""
                  className="w-10 h-10 rounded object-contain border border-navy/10"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-sky-light">
                  <Building2 size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200 truncate">{c.name}</div>
                <div className="text-xs text-slate-200/60 truncate">
                  {COMPANY_STATUS_LABELS[c.status]}
                </div>
                <div className="mt-1">
                  <CompanyPortalLink subdomain={c.subdomain} compact />
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-white/10 text-slate-400">
                {COMPANY_ROLE_LABELS[c.myRole]}
              </span>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-slate-200/70">
              <span className="flex items-center gap-1">
                <FolderKanban size={12} /> {c.projectCount} dự án
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} /> {c.memberCount} thành viên
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-sky-light">
                {enteringId === c.id ? "Đang vào…" : "Vào không gian làm việc →"}
              </span>
              <Link
                href={`/erp/cong-ty/${c.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-slate-400 hover:text-slate-200 underline"
              >
                Chi tiết
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, FolderKanban, Package, Puzzle } from "lucide-react";
import { CompanyPortalLink } from "@/components/erp/CompanyPortalLink";
import { platformCompanyUrl } from "@/lib/platform/paths";

interface Row {
  id: number;
  code: string;
  subdomain: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  activeModules: number;
  monthlyRevenue: number;
}

export function PlatformCompanyList() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/companies")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Lỗi tải");
        }
        return r.json();
      })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-300 rounded p-4 text-sm">{error}</div>
    );
  }
  if (rows === null) return <div className="text-sm text-slate-300/60">Đang tải…</div>;

  const totalRevenue = rows.reduce((s, r) => s + r.monthlyRevenue, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Tổng công ty" value={rows.length} icon={<Building2 size={18} />} />
        <Stat
          label="Tổng module đang chạy"
          value={rows.reduce((s, r) => s + r.activeModules, 0)}
          icon={<Package size={18} />}
        />
        <Stat
          label="Doanh thu hàng tháng"
          value={`${new Intl.NumberFormat("vi-VN").format(totalRevenue)} ₫`}
          icon={<FolderKanban size={18} />}
          accent
        />
      </div>

      <p className="text-xs text-slate-400">
        Chọn một công ty để bật/tắt gói module ERP. Thay đổi có hiệu lực ngay — menu sidebar của
        công ty đó sẽ cập nhật theo.{" "}
        <Link href="/erp/platform/dang-ky-cty" className="text-sky-light hover:underline">
          Xem hồ sơ đăng ký tự động
        </Link>
      </p>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-xl border border-white/10 px-4 py-8 text-center text-slate-400 text-sm">
            Chưa có công ty nào đăng ký.
          </div>
        )}
        {rows.map((r) => (
          <article
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(platformCompanyUrl(r.id))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(platformCompanyUrl(r.id));
              }
            }}
            className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-sky/30 transition-colors cursor-pointer p-4 flex flex-wrap items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-sky/15 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-sky-light" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold text-white">{r.name}</div>
              <div className="text-[11px] font-mono text-slate-500">{r.code}</div>
              <div className="mt-1">
                <CompanyPortalLink subdomain={r.subdomain} compact />
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {r.email || "—"}
                {r.phone ? ` · ${r.phone}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm tabular-nums">
              <Metric label="Thành viên" value={String(r.memberCount)} />
              <Metric
                label="Module bật"
                value={String(r.activeModules)}
                accent
              />
              <Metric
                label="Thuê / tháng"
                value={
                  r.monthlyRevenue
                    ? `${new Intl.NumberFormat("vi-VN").format(r.monthlyRevenue)} ₫`
                    : "—"
                }
              />
            </div>
            <Link
              href={platformCompanyUrl(r.id)}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-sky text-white px-3 py-2 rounded-lg hover:bg-sky-light shrink-0"
            >
              <Puzzle size={14} /> Gói module
              <ChevronRight size={14} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className={`font-semibold ${accent ? "text-emerald-300" : "text-slate-200"}`}>
        {value}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        accent
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon} {label}
      </div>
      <div className="text-xl font-semibold mt-1 tabular-nums text-white">{value}</div>
    </div>
  );
}

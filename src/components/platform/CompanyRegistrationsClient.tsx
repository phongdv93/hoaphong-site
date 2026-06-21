"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ClipboardList } from "lucide-react";

type Row = {
  id: number;
  companyName: string;
  taxCode: string;
  phone: string;
  adminName: string;
  adminEmail: string;
  status: string;
  rejectionReason: string | null;
  companyId: number | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  auto_approved: "Tự động duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  pending: "Chờ xử lý",
};

export function CompanyRegistrationsClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/company-registrations")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Không tải được");
        }
        return r.json();
      })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, []);

  if (error) {
    return (
      <div className="erp-card p-4 text-sm text-rose-200">
        {error}
        <Link href="/erp/platform/cong-ty" className="block mt-2 text-sky-light underline">
          Về Platform
        </Link>
      </div>
    );
  }

  if (!rows) {
    return <p className="text-sm text-slate-400">Đang tải…</p>;
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="erp-card rounded-xl p-5">
        <h2 className="font-semibold text-white text-sm inline-flex items-center gap-2 mb-1">
          <ClipboardList size={18} className="text-sky" />
          Hồ sơ đăng ký doanh nghiệp
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Người dùng gửi tại{" "}
          <Link href="/erp/register" className="text-sky-light underline">
            /erp/register
          </Link>
          . Hệ thống tự duyệt khi MST hợp lệ, chưa trùng, và (nếu cấu hình) tra cứu được
          doanh nghiệp còn hoạt động.
        </p>

        <div className="border border-white/10 rounded-lg overflow-x-auto">
          <table className="w-full text-sm text-slate-200">
            <thead className="bg-white/5 text-xs text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Thời gian</th>
                <th className="px-3 py-2 text-left">Công ty</th>
                <th className="px-3 py-2 text-left">MST</th>
                <th className="px-3 py-2 text-left">Admin</th>
                <th className="px-3 py-2 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Chưa có hồ sơ
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.companyName}</div>
                      {r.rejectionReason && (
                        <div className="text-[10px] text-rose-300/90 mt-0.5">{r.rejectionReason}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.taxCode}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{r.adminName}</div>
                      <div className="text-slate-500 font-mono">{r.adminEmail}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          r.status === "auto_approved" || r.status === "approved"
                            ? "text-emerald-400"
                            : r.status === "rejected"
                            ? "text-rose-400"
                            : "text-amber-300"
                        }
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      {r.companyId && (
                        <Link
                          href={`/erp/platform/cong-ty/${r.companyId}`}
                          className="block text-[10px] text-sky-light hover:underline mt-0.5"
                        >
                          Công ty #{r.companyId}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Link
        href="/erp/platform/cong-ty"
        className="inline-flex items-center gap-1 text-sm text-sky-light hover:underline"
      >
        <Building2 size={14} /> Về danh sách công ty
      </Link>
    </div>
  );
}

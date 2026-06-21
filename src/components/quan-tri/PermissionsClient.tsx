"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Users } from "lucide-react";
import { COMPANY_ROLE_LABELS } from "@/lib/projects/constants";
import type { CompanyMemberRole } from "@/lib/projects/types";

type PermMember = {
  userId: number;
  name?: string;
  email?: string;
  role: CompanyMemberRole;
  roleLabel: string;
  accessSummary: string;
};

type PermData = {
  canManage: boolean;
  canViewAll: boolean;
  myRole: CompanyMemberRole | null;
  activeModules: { id: string; name: string }[];
  members: PermMember[];
  rules: { role: string; access: string }[];
};

export function PermissionsClient() {
  const [data, setData] = useState<PermData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/quan-tri/permissions");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tải được phân quyền");
      setData(null);
      return;
    }
    setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="erp-card border-amber-500/40 p-4 text-sm text-amber-100 space-y-2">
        <p>{error}</p>
        <Link href="/erp" className="text-sky-light underline text-xs">
          Về ERP
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-slate-400">Đang tải…</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="erp-card p-4 text-sm text-slate-300 space-y-2">
        <h2 className="font-semibold text-white inline-flex items-center gap-2">
          <Shield size={18} className="text-sky" />
          Cách phân quyền hoạt động
        </h2>
        <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
          {data.rules.map((r) => (
            <li key={r.role}>
              <strong className="text-slate-300">
                {COMPANY_ROLE_LABELS[r.role as CompanyMemberRole] ?? r.role}
              </strong>
              : {r.access}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500 pt-1">
          Hoa Phong bật <em>gói module</em> cho công ty (Dự án, HR, Kho…). Admin công ty gán module
          chi tiết cho từng nhân viên tại HR.
        </p>
      </div>

      <div className="erp-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-white text-sm inline-flex items-center gap-2">
            <Users size={16} className="text-sky" />
            {data.canViewAll ? "Nhân sự & quyền module" : "Quyền của bạn"}
          </h3>
          {data.canManage && (
            <Link href="/erp/hr/nhan-su" className="text-xs text-sky-light hover:underline">
              Sửa quyền tại HR →
            </Link>
          )}
        </div>

        <div className="text-xs text-slate-500 mb-2">
          Module công ty đang bật:{" "}
          {data.activeModules.length > 0
            ? data.activeModules.map((m) => m.name).join(", ")
            : "—"}
        </div>

        <div className="border border-white/10 rounded overflow-hidden">
          <table className="w-full text-sm text-slate-200">
            <thead className="bg-white/5 text-xs text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Nhân viên</th>
                <th className="px-3 py-2 text-left font-medium">Vai trò</th>
                <th className="px-3 py-2 text-left font-medium">Quyền module ERP</th>
              </tr>
            </thead>
            <tbody>
              {data.members.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                    Chưa có nhân sự
                  </td>
                </tr>
              ) : (
                data.members.map((m) => (
                  <tr key={m.userId} className="border-t border-white/10">
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{m.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{m.roleLabel}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{m.accessSummary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Clock, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ERP } from "@/lib/paths";
import { companyErpLoginUrl } from "@/lib/tenant-host";

export default function PendingApprovalPage() {
  const [info, setInfo] = useState<{
    companyName?: string;
    companyCode?: string;
    subdomain?: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((j) => {
        setInfo({
          companyName: j.membership?.companyName ?? j.tenant?.name,
          companyCode: j.membership?.companyCode ?? j.tenant?.code,
          subdomain: j.tenant?.code,
          status: j.membership?.status,
        });
        if (j.membership?.status === "active") {
          const code = j.membership?.companyCode ?? j.tenant?.code;
          window.location.href = code ? `/erp/c/${code}` : ERP.base;
        }
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    const host = window.location.host;
    const key = info?.subdomain ?? info?.companyCode;
    window.location.href = key ? companyErpLoginUrl(key, host) : ERP.login;
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="glass-dark rounded-2xl p-8 max-w-md text-center w-full">
        <Logo light />
        <div className="mt-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 text-amber-300">
          <Clock size={28} />
        </div>
        <h1 className="text-xl font-bold text-white mt-4">Đang chờ duyệt quyền</h1>
        <p className="text-sm text-slate-400 mt-2">
          Tài khoản của bạn tại{" "}
          <strong className="text-white">{info?.companyName ?? "công ty"}</strong> đã được tạo.
          Quản trị viên công ty cần duyệt trước khi bạn truy cập module ERP.
        </p>
        <p className="text-xs text-slate-500 mt-4">
          Trạng thái: {info?.status === "pending" ? "Chờ duyệt" : "—"}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-white/20 px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 text-sm"
          >
            Kiểm tra lại
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-6">
          Liên hệ admin công ty nếu chờ quá lâu.
        </p>
      </div>
    </div>
  );
}

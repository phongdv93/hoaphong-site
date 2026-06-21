"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Puzzle, Settings, ShieldAlert } from "lucide-react";
import { platformCompanyUrl } from "@/lib/platform/paths";

type GateState = "loading" | "ready" | "no_module" | "not_configured";

interface ProfileCheck {
  configured: boolean;
}

export function CustomsSetupGate({
  children,
  compact,
}: {
  children: React.ReactNode;
  /** Chỉ hiện banner nhỏ phía trên, vẫn cho xem danh sách cũ */
  compact?: boolean;
}) {
  const [state, setState] = useState<GateState>("loading");
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);

  const check = useCallback(async () => {
    setState("loading");
    const [profRes, accessRes] = await Promise.all([
      fetch("/api/customs/profile"),
      fetch("/api/platform/my-access"),
    ]);

    if (accessRes.ok) {
      const access = await accessRes.json();
      setPlatformAdmin(Boolean(access.isPlatformAdmin));
      setActiveCompanyId(access.activeCompanyId ?? null);
    }

    if (profRes.status === 403) {
      setState("no_module");
      return;
    }
    if (!profRes.ok) {
      setState("not_configured");
      return;
    }
    const j = (await profRes.json()) as ProfileCheck;
    setState(j.configured ? "ready" : "not_configured");
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (state === "loading") {
    return (
      <p className="text-slate-400 text-sm py-8 text-center">Đang kiểm tra cấu hình HQ…</p>
    );
  }

  if (state === "ready") {
    return <>{children}</>;
  }

  if (state === "no_module") {
    return (
      <BlockedPanel
        icon={<ShieldAlert className="text-amber-400" size={28} />}
        title="Module Xuất nhập khẩu chưa được bật"
        description="Công ty đang chọn chưa có quyền module XNK. Ultimate cần bật gói module trước."
        primaryHref={
          platformAdmin && activeCompanyId
            ? platformCompanyUrl(activeCompanyId)
            : "/erp"
        }
        primaryLabel={
          platformAdmin ? "Mở gói module công ty" : "Về trang chủ ERP"
        }
      />
    );
  }

  const notConfiguredBanner = (
    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 flex gap-3">
      <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={22} />
      <div className="text-sm">
        <p className="font-medium text-amber-100">Chưa cấu hình VNACCS</p>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
          Lưu một lần 4 thông số HQ (User Code, Terminal ID, mật khẩu, access key) trước khi
          tạo lô hàng hoặc gửi IDA/IDC.
        </p>
        <Link
          href="/erp/xnk/cau-hinh"
          className="inline-flex items-center gap-1.5 mt-3 bg-sky text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-light"
        >
          <Settings size={14} /> Đi tới Cấu hình VNACCS
        </Link>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {notConfiguredBanner}
        {children}
      </div>
    );
  }

  return (
    <BlockedPanel
      icon={<Puzzle className="text-sky-light" size={28} />}
      title="Cần cấu hình VNACCS trước"
      description="Nhập và lưu thông số kết nối hải quan một lần — sau đó mới tạo tờ khai và gửi HQ (hoặc chạy mô phỏng)."
      primaryHref="/erp/xnk/cau-hinh"
      primaryLabel="Cấu hình VNACCS ngay"
    />
  );
}

function BlockedPanel({
  icon,
  title,
  description,
  primaryHref,
  primaryLabel,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto py-12 px-4 space-y-4">
      <div className="text-center space-y-3">
        <div className="flex justify-center">{icon}</div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{description}</p>
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-2 bg-sky text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-light"
        >
          {primaryLabel}
        </Link>
      </div>
      {extra}
    </div>
  );
}

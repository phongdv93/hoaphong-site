"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { companyErpLoginUrl, companyErpRegisterUrl } from "@/lib/tenant-host";

export function CompanyPortalLink({
  subdomain,
  companyName,
  compact,
}: {
  subdomain: string;
  companyName?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [loginUrl, setLoginUrl] = useState(() => companyErpLoginUrl(subdomain));
  const [registerUrl, setRegisterUrl] = useState(() =>
    companyErpRegisterUrl(subdomain)
  );

  useEffect(() => {
    const host = window.location.host;
    setLoginUrl(companyErpLoginUrl(subdomain, host));
    setRegisterUrl(companyErpRegisterUrl(subdomain, host));
  }, [subdomain]);

  async function copyLogin() {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const portalHost =
    typeof window !== "undefined"
      ? new URL(loginUrl).host
      : `${subdomain}.hoaphong.com.vn`;

  if (compact) {
    return (
      <a
        href={loginUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-mono text-sky-light hover:underline"
      >
        {portalHost}
        <ExternalLink size={11} />
      </a>
    );
  }

  return (
    <div className="rounded-lg border border-sky/25 bg-sky/5 px-3 py-2.5 text-sm space-y-1.5">
      <p className="text-xs text-slate-400">
        Link ERP {companyName ? `· ${companyName}` : ""} (nhân viên đăng ký / đăng nhập)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={loginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sky-light text-xs hover:underline break-all"
        >
          {loginUrl}
        </a>
        <button
          type="button"
          onClick={copyLogin}
          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white border border-white/15 rounded px-2 py-0.5"
        >
          <Copy size={11} /> {copied ? "Đã copy" : "Copy"}
        </button>
      </div>
      <p className="text-[10px] text-slate-500">
        Đăng ký:{" "}
        <a href={registerUrl} className="text-sky-light/80 hover:underline font-mono">
          {registerUrl}
        </a>
      </p>
    </div>
  );
}

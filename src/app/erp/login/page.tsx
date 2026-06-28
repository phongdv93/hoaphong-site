"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Loader2, LogIn } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ERP } from "@/lib/paths";
import { companyErpRegisterUrl } from "@/lib/tenant-host";

type Phase = "form" | "redirecting";

type TenantInfo = {
  name: string;
  code: string;
  subdomain: string;
};

export default function ErpLoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [redirectLabel, setRedirectLabel] = useState("Đang xác định quyền truy cập…");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  const registerUrl = useMemo(() => {
    if (!tenant) return "/erp/dang-ky";
    const host = typeof window !== "undefined" ? window.location.host : undefined;
    return companyErpRegisterUrl(tenant.subdomain || tenant.code, host);
  }, [tenant]);

  useEffect(() => {
    fetch("/api/auth/tenant")
      .then((r) => r.json())
      .then((j) => {
        if (j.company) {
          setTenant({
            name: j.company.name,
            code: j.company.code,
            subdomain: j.company.subdomain ?? j.company.code,
          });
        }
      })
      .catch(() => {});

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        if (session.user) {
          void runRedirect();
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runRedirect() {
    setPhase("redirecting");
    await new Promise((r) => setTimeout(r, 3000));

    try {
      const res = await fetch("/api/auth/redirect");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setRedirectLabel(data.label || "Đang chuyển hướng…");
        router.push(data.url);
        router.refresh();
        return;
      }
      router.push(ERP.base);
      router.refresh();
    } catch {
      router.push(ERP.base);
      router.refresh();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.email ?? "").trim(),
          password: String(data.password ?? ""),
        }),
      });

      if (res.ok) {
        await runRedirect();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || `Đăng nhập thất bại (${res.status})`);
      }
    } catch {
      setError("Không kết nối được server — thử lại sau");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "redirecting") {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="relative text-center space-y-4">
          <Loader2 className="w-10 h-10 text-sky-light animate-spin mx-auto" />
          <p className="text-white font-medium">{redirectLabel}</p>
          <p className="text-sm text-slate-400">Hệ thống đang chọn không gian làm việc phù hợp…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="relative w-full max-w-md">
        <div className="glass-dark rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <Logo light />
            <h1 className="font-display text-2xl font-bold text-white mt-4">Đăng nhập ERP</h1>
            {tenant ? (
              <p className="text-sm text-slate-400 text-center mt-1 flex items-center gap-1">
                <Building2 size={14} />
                {tenant.name}
              </p>
            ) : (
              <p className="text-sm text-slate-400 text-center mt-1">
                Một cửa cho admin Hoa Phong, quản trị công ty và nhân viên
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="email@congty.com"
                className="input-field-dark"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-300">Mật khẩu</label>
                <Link href={ERP.forgotPassword} className="text-xs text-sky-light hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input-field-dark"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              <LogIn size={18} />
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <p className="text-xs text-slate-400 text-center pt-2">
              {tenant ? (
                <>
                  Chưa có tài khoản?{" "}
                  <Link href={registerUrl} className="text-emerald font-medium hover:underline">
                    Đăng ký nhân viên
                  </Link>
                </>
              ) : (
                <>
                  Doanh nghiệp mới?{" "}
                  <Link href="/erp/register" className="text-emerald font-medium hover:underline">
                    Đăng ký công ty
                  </Link>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

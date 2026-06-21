"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LogIn } from "lucide-react";
import { ERP } from "@/lib/paths";
import { companyErpRegisterUrl, tenantAwareErpPath } from "@/lib/tenant-host";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<{
    code: string;
    name: string;
    subdomain: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/tenant")
      .then((r) => r.json())
      .then((j) => {
        if (j.company) {
          setTenant({
            code: j.company.code,
            name: j.company.name,
            subdomain: j.company.subdomain ?? j.company.code,
          });
        }
      })
      .catch(() => {});
  }, []);

  const tenantLinks = useMemo(() => {
    if (!tenant) return null;
    const host = typeof window !== "undefined" ? window.location.host : undefined;
    const key = tenant.subdomain || tenant.code;
    return {
      register: companyErpRegisterUrl(key, host),
      forgot: tenantAwareErpPath(ERP.forgotPassword, key, host),
    };
  }, [tenant]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const session = await fetch("/api/auth/session").then((r) => r.json()).catch(() => ({}));
        const companyCode = tenant?.code ?? session.tenant?.code;
        if (session.membership?.status === "pending") {
          router.push(
            tenantAwareErpPath("/erp/cho-duyet", tenant?.subdomain ?? tenant?.code, window.location.host)
          );
        } else if (companyCode) {
          router.push(`/erp/c/${companyCode}`);
        } else {
          router.push(ERP.base);
        }
        router.refresh();
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

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="relative w-full max-w-md">
        <div className="glass-dark rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <Logo light />
            <h1 className="font-display text-2xl font-bold text-white mt-4">
              {tenant ? tenant.name : "Admin Dashboard"}
            </h1>
            <p className="text-sm text-slate-400">
              {tenant ? (
                <>
                  Đăng nhập ERP · <span className="font-mono">{tenant.code}</span>
                </>
              ) : (
                "Hoa Phong — Quản trị website"
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                defaultValue="admin@hoaphong.vn"
                className="input-field-dark"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-300">Mật khẩu</label>
                <Link
                  href={tenantLinks?.forgot ?? ERP.forgotPassword}
                  className="text-xs text-sky-light hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                name="password"
                type="password"
                required
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
                  <Link
                    href={tenantLinks?.register ?? "/erp/dang-ky"}
                    className="text-emerald font-medium hover:underline"
                  >
                    Đăng ký nhân viên
                  </Link>
                </>
              ) : (
                <>
                  Doanh nghiệp mới?{" "}
                  <Link href="/erp/register" className="text-emerald font-medium hover:underline">
                    Đăng ký tài khoản công ty
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

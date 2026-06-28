"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, UserPlus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ERP } from "@/lib/paths";
import { ERP_DEPARTMENTS } from "@/lib/erp/departments";
import { AppSelect } from "@/components/ui/AppSelect";
import { companyErpLoginUrl } from "@/lib/tenant-host";

export function EmployeeRegisterPage() {
  const searchParams = useSearchParams();
  const rejected = searchParams.get("rejected") === "1";

  const [tenant, setTenant] = useState<{
    code: string;
    name: string;
    subdomain: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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

  const loginUrl = useMemo(() => {
    if (!tenant) return ERP.login;
    const host = typeof window !== "undefined" ? window.location.host : undefined;
    return companyErpLoginUrl(tenant.subdomain || tenant.code, host);
  }, [tenant]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        departmentId: departmentId || undefined,
        companyCode: tenant?.code,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      return;
    }
    const j = await res.json().catch(() => ({}));
    setError(j.error || "Đăng ký thất bại");
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <div className="glass-dark rounded-2xl p-8 max-w-md text-center text-slate-300">
          <p className="mb-4">
            Đăng ký nhân viên qua link công ty — ví dụ{" "}
            <span className="font-mono text-sky-light">0318313318.hoaphong.com.vn</span> hoặc{" "}
            <span className="font-mono text-sky-light">ten-cty.hoaphong.com.vn</span>. Khi test bằng
            IP:{" "}
            <span className="font-mono text-sky-light">http://IP/erp/dang-ky?tenant=ma-cty</span>
          </p>
          <Link href={loginUrl} className="text-sky-light hover:underline text-sm">
            ← Đăng nhập ERP
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <div className="glass-dark rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-white mb-2">Đã gửi đăng ký</h1>
          <p className="text-sm text-slate-400 mb-6">
            Tài khoản của bạn tại <strong className="text-white">{tenant.name}</strong> đang chờ
            quản trị viên duyệt. Sau khi duyệt, bạn đăng nhập để vào hệ thống.
          </p>
          <Link href={loginUrl} className="btn-primary inline-flex">
            Đăng nhập công ty
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="relative w-full max-w-lg">
        <div className="glass-dark rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <Logo light />
            <h1 className="font-display text-2xl font-bold text-white mt-4 flex items-center gap-2">
              <UserPlus size={22} /> Đăng ký nhân viên
            </h1>
            <p className="text-sm text-slate-400 mt-1 text-center flex items-center gap-1">
              <Building2 size={14} />
              {tenant.name}
              <span className="font-mono text-slate-500">({tenant.code})</span>
            </p>
          </div>

          {rejected && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Hồ sơ trước đó bị từ chối. Bạn có thể đăng ký lại.
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <Field label="Họ tên *" value={name} onChange={setName} required />
            <Field
              label="Email đăng nhập *"
              type="email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              label="Mật khẩu (≥ 6 ký tự) *"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phòng ban</label>
              <AppSelect
                value={departmentId}
                onChange={setDepartmentId}
                className="input-field-dark w-full text-left flex items-center justify-between"
                options={[
                  { value: "", label: "— Chọn phòng ban —" },
                  ...ERP_DEPARTMENTS.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? "Đang gửi…" : "Đăng ký — chờ admin duyệt"}
            </button>

            <p className="text-xs text-slate-400 text-center pt-2">
              Đã có tài khoản?{" "}
              <Link href={loginUrl} className="text-emerald font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field-dark"
      />
    </div>
  );
}

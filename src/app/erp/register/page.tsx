"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Building2, CheckCircle2, Eye, EyeOff, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      setLoading(false);
      return;
    }

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    delete data.confirmPassword;

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      setSuccess(json.verifySummary || "Đăng ký thành công — đang chuyển vào ERP…");
      router.push(json.companyCode ? `/erp/c/${json.companyCode}` : "/erp");
      router.refresh();
    } else {
      setError(json.error || "Đăng ký thất bại");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="relative w-full max-w-lg">
        <div className="glass-dark rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <Logo light />
            <h1 className="font-display text-2xl font-bold text-white mt-4 flex items-center gap-2">
              <Building2 size={22} /> Đăng ký doanh nghiệp
            </h1>
            <p className="text-sm text-slate-400 mt-1 text-center">
              Điền form — hệ thống tự kiểm tra MST, trùng lặp và tạo công ty ngay khi hợp lệ.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Field
              name="companyName"
              label="Tên công ty (trùng ĐKKD) *"
              placeholder="VD: CÔNG TY TNHH ĐẦU TƯ THƯƠNG MẠI ABC"
              required
            />
            <Field
              name="taxCode"
              label="Mã số thuế *"
              placeholder="10 số, VD: 0318313318"
              required
            />
            <Field name="address" label="Địa chỉ trụ sở" placeholder="Số nhà, quận, tỉnh…" />
            <Field name="phone" label="Điện thoại công ty *" placeholder="0901234567" required />
            <hr className="my-4 border-white/10" />
            <p className="text-xs text-slate-500">Tài khoản quản trị công ty</p>
            <Field name="name" label="Họ tên người quản trị *" required />
            <Field name="email" label="Email đăng nhập *" type="email" required />
            <PasswordField
              label="Mật khẩu (≥ 6 ký tự) *"
              name="password"
              value={password}
              onChange={setPassword}
              required
            />
            <PasswordField
              label="Xác nhận mật khẩu *"
              name="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="bg-rose-500/15 border border-rose-400/40 text-rose-200 rounded p-2 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 rounded p-2 text-sm flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              <UserPlus size={18} />
              {loading ? "Đang kiểm tra & tạo…" : "Gửi hồ sơ — tự động duyệt"}
            </button>

            <p className="text-xs text-slate-400 text-center pt-2">
              Đã có tài khoản?{" "}
              <Link href="/erp/login" className="text-emerald font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Điều kiện tự duyệt: MST hợp lệ, chưa đăng ký trên Hoa Phong, email mới, doanh nghiệp
              còn hoạt động (khi bật tra cứu MST). Từ chối sẽ ghi lý do — không cần gọi điện.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="input-field-dark w-full"
      />
    </div>
  );
}

function PasswordField({
  name,
  label,
  value,
  onChange,
  required,
  autoComplete = "new-password",
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={6}
          className="input-field-dark w-full pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded"
          tabIndex={-1}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

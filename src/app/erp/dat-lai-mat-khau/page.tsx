"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (!token) {
      setError("Link không hợp lệ — yêu cầu link mới từ trang quên mật khẩu");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "Đặt lại mật khẩu thất bại");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/erp/login"), 2500);
    } catch {
      setError("Không kết nối được server");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4 text-sm text-slate-300">
        <p>Link đặt lại mật khẩu không hợp lệ hoặc thiếu mã.</p>
        <Link href="/erp/quen-mat-khau" className="text-sky-light hover:underline">
          Yêu cầu link mới
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
        <p className="text-emerald-200">Đã đổi mật khẩu thành công!</p>
        <p className="text-sm text-slate-400">Đang chuyển tới đăng nhập…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordInput
        label="Mật khẩu mới (≥ 6 ký tự)"
        value={password}
        onChange={setPassword}
        show={show}
        onToggle={() => setShow((s) => !s)}
      />
      <PasswordInput
        label="Xác nhận mật khẩu"
        value={confirmPassword}
        onChange={setConfirmPassword}
        show={show}
        onToggle={() => setShow((s) => !s)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
        <Lock size={18} />
        {loading ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field-dark pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          tabIndex={-1}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="relative w-full max-w-md">
        <div className="glass-dark rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <Logo light />
            <h1 className="font-display text-2xl font-bold text-white mt-4">Mật khẩu mới</h1>
            <p className="text-sm text-slate-400 mt-1">Đặt mật khẩu đăng nhập ERP</p>
          </div>
          <Suspense
            fallback={<p className="text-center text-slate-400 text-sm">Đang tải…</p>}
          >
            <ResetPasswordForm />
          </Suspense>
          <p className="text-xs text-slate-400 text-center mt-6">
            <Link href="/erp/login" className="text-sky-light hover:underline">
              ← Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { KeyRound, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [mailSent, setMailSent] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "Gửi yêu cầu thất bại");
        return;
      }

      setDone(true);
      setMailSent(Boolean(json.mailSent));
      setMailError(json.mailError ?? null);
      if (json.resetUrl) setResetUrl(json.resetUrl);
    } catch {
      setError("Không kết nối được server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="relative w-full max-w-md">
        <div className="glass-dark rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <Logo light />
            <h1 className="font-display text-2xl font-bold text-white mt-4 flex items-center gap-2">
              <KeyRound size={22} /> Quên mật khẩu
            </h1>
            <p className="text-sm text-slate-400 mt-1 text-center">
              Nhập email đăng ký — gửi link đặt mật khẩu mới
            </p>
          </div>

          {done ? (
            <div className="space-y-4 text-sm">
              <div className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 rounded-lg p-3">
                {mailSent
                  ? "Đã gửi email hướng dẫn (kiểm tra hộp thư và spam)."
                  : resetUrl
                    ? "Không gửi được email — dùng link bên dưới (hiệu lực 1 giờ)."
                    : "Nếu email có trong hệ thống, yêu cầu đã được ghi nhận."}
              </div>
              {!mailSent && resetUrl && (
                <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 space-y-2">
                  {mailError && (
                    <p className="text-amber-200/80 text-xs">Lỗi gửi mail: {mailError}</p>
                  )}
                  <a
                    href={resetUrl}
                    className="block font-mono text-xs text-sky-light break-all hover:underline"
                  >
                    {resetUrl}
                  </a>
                </div>
              )}
              <Link href="/erp/login" className="btn-primary w-full text-center block">
                Về đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field-dark"
                  placeholder="email@congty.com"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                <Mail size={18} />
                {loading ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}
              </button>
              <p className="text-xs text-slate-400 text-center">
                <Link href="/erp/login" className="text-sky-light hover:underline">
                  ← Quay lại đăng nhập
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

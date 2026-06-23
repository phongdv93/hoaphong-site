"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mailSent, setMailSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [mailError, setMailError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetUrl(null);
    setDevOtp(null);

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

      setMailSent(Boolean(json.mailSent));
      setMailError(json.mailError ?? null);
      if (json.resetUrl) setResetUrl(json.resetUrl);
      if (json.devOtp) setDevOtp(json.devOtp);
      setStep("otp");
    } catch {
      setError("Không kết nối được server");
    } finally {
      setLoading(false);
    }
  }

  async function resetWithOtp(e: React.FormEvent) {
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

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          password,
          confirmPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "Đặt lại mật khẩu thất bại");
        return;
      }

      setStep("done");
      setTimeout(() => router.push("/erp/login"), 2500);
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
              {step === "email"
                ? "Nhập email đăng ký — gửi mã OTP 6 số về hộp thư"
                : step === "otp"
                  ? "Nhập mã OTP và mật khẩu mới"
                  : "Hoàn tất"}
            </p>
          </div>

          {step === "done" ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
              <p className="text-emerald-200">Đã đổi mật khẩu thành công!</p>
              <p className="text-sm text-slate-400">Đang chuyển tới đăng nhập…</p>
            </div>
          ) : step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field-dark"
                  placeholder="phongdv93@gmail.com"
                  autoComplete="email"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                <Mail size={18} />
                {loading ? "Đang gửi…" : "Gửi mã OTP"}
              </button>
              <p className="text-xs text-slate-400 text-center">
                <Link href="/erp/login" className="text-sky-light hover:underline">
                  ← Quay lại đăng nhập
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={resetWithOtp} className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3 text-sm text-emerald-200">
                {mailSent
                  ? `Đã gửi OTP tới ${email} — kiểm tra hộp thư và spam.`
                  : "Nếu email có trong hệ thống, yêu cầu đã được ghi nhận."}
              </div>
              {!mailSent && (devOtp || resetUrl) && (
                <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 space-y-2 text-xs">
                  {mailError && <p className="text-amber-200/80">Lỗi gửi mail: {mailError}</p>}
                  {devOtp && (
                    <p className="text-amber-100">
                      OTP (dev):{" "}
                      <span className="font-mono text-lg tracking-widest">{devOtp}</span>
                    </p>
                  )}
                  {resetUrl && (
                    <a href={resetUrl} className="block font-mono text-sky-light break-all hover:underline">
                      {resetUrl}
                    </a>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Mã OTP (6 số)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="input-field-dark font-mono text-lg tracking-[0.3em] text-center"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Mật khẩu mới (≥ 6 ký tự)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field-dark"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field-dark"
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                <ShieldCheck size={18} />
                {loading ? "Đang lưu…" : "Đổi mật khẩu"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                }}
                className="w-full text-xs text-slate-400 hover:text-sky-light"
              >
                ← Gửi lại OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

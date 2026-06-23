"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { ErpShell } from "@/components/erp/ErpShell";
import { ERP } from "@/lib/paths";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(ERP.login);
        return;
      }
      if (!res.ok) {
        setError(json.error || "Đổi mật khẩu thất bại");
        return;
      }

      setDone(true);
    } catch {
      setError("Không kết nối được server");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <ErpShell title="Đổi mật khẩu">
        <div className="max-w-md mx-auto p-6">
          <div className="erp-card p-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto text-emerald-400" size={40} />
            <p className="text-emerald-200 font-medium">Đã đổi mật khẩu thành công</p>
            <Link href={ERP.base} className="text-sky-light text-sm hover:underline">
              ← Về ERP
            </Link>
          </div>
        </div>
      </ErpShell>
    );
  }

  return (
    <ErpShell title="Đổi mật khẩu">
      <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
        <Lock size={20} /> Đổi mật khẩu
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Quên mật khẩu?{" "}
        <Link href={ERP.forgotPassword} className="text-sky-light hover:underline">
          Dùng OTP qua email
        </Link>
      </p>

      <form onSubmit={submit} className="erp-card p-6 space-y-4">
        <Field
          label="Mật khẩu hiện tại"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <Field
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <Field
          label="Xác nhận mật khẩu mới"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Đang lưu…" : "Lưu mật khẩu mới"}
        </button>
      </form>
      </div>
    </ErpShell>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full"
        autoComplete={autoComplete}
      />
    </div>
  );
}

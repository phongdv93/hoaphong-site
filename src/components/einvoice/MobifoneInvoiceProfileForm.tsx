"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Pencil, Radio, Building2 } from "lucide-react";
import type { CompanyEinvoiceContext, MobifoneInvoiceProfile } from "@/lib/einvoice/types";
import { MOBIFONE_TEST_DEFAULT_BASE } from "@/lib/einvoice/config";

export function MobifoneInvoiceProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MobifoneInvoiceProfile | null>(null);
  const [company, setCompany] = useState<CompanyEinvoiceContext | null>(null);
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(true);
  const [apiUsername, setApiUsername] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [isTestMode, setIsTestMode] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    simulated?: boolean;
    baseUrl?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/einvoice/profile");
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Không tải được cấu hình");
      setLoading(false);
      return;
    }
    setCompany(j.company as CompanyEinvoiceContext | null);
    if (j.profile) {
      const p = j.profile as MobifoneInvoiceProfile;
      setProfile(p);
      setApiUsername(p.apiUsername);
      setApiBaseUrl(p.apiBaseUrl ?? "");
      setIsTestMode(p.isTestMode);
      setConfigured(Boolean(j.configured));
      setEditing(!j.configured);
    } else {
      setProfile(null);
      setConfigured(false);
      setEditing(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const suggestedUrl = company?.taxCode
    ? isTestMode
      ? MOBIFONE_TEST_DEFAULT_BASE
      : `https://${company.taxCode.replace(/\D/g, "")}.mobifoneinvoice.vn`
    : "";

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    setError("");
    const res = await fetch("/api/einvoice/profile/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiUsername,
        apiPassword: apiPassword || undefined,
        apiBaseUrl: apiBaseUrl || undefined,
        isTestMode,
      }),
    });
    const j = await res.json();
    setTesting(false);
    setTestResult(j);
    if (!res.ok) setError(j.message || "Kiểm tra thất bại");
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/einvoice/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiUsername,
        apiPassword: apiPassword || undefined,
        apiBaseUrl: apiBaseUrl || undefined,
        isTestMode,
      }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(j.error || "Lưu thất bại");
      return;
    }
    setProfile(j.profile as MobifoneInvoiceProfile);
    setConfigured(true);
    setEditing(false);
    setApiPassword("");
    setMessage(j.message || "Đã lưu.");
    void load();
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Đang tải cấu hình…</p>;
  }

  if (!company?.taxCode?.trim()) {
    return (
      <div className="erp-card p-4 border-amber-500/30 bg-amber-500/10 text-amber-100 text-sm">
        Công ty chưa có <strong>mã số thuế</strong>. Cập nhật hồ sơ công ty trước khi kết nối MobiFone
        Invoice.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="erp-card p-4">
        <div className="flex items-start gap-3">
          <Building2 className="text-sky shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Thông tin công ty (từ hồ sơ đăng ký)
            </p>
            <p className="font-medium text-slate-100">{company.name}</p>
            <p className="text-sm text-slate-300 mt-1">MST: {company.taxCode}</p>
            {company.address && (
              <p className="text-sm text-slate-400 mt-0.5">{company.address}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              API đăng nhập dùng MST này. URL mặc định:{" "}
              <span className="font-mono text-slate-400">{suggestedUrl || "—"}</span>
            </p>
          </div>
        </div>
      </div>

      {configured && !editing && profile && (
        <div className="erp-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 size={18} />
              <span className="font-medium">Đã kết nối MobiFone</span>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="quote-tool-btn text-sm !py-1.5"
            >
              <Pencil size={14} /> Chỉnh sửa
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-slate-500">Tài khoản API</dt>
              <dd className="text-slate-200">{profile.apiUsername}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mã đơn vị (ma_dvcs)</dt>
              <dd className="text-slate-200">{profile.maDvcs || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">URL API đang dùng</dt>
              <dd className="text-slate-200 font-mono text-xs break-all">
                {profile.resolvedBaseUrl || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Môi trường</dt>
              <dd className="text-slate-200">{profile.isTestMode ? "Kiểm thử" : "Chính thức"}</dd>
            </div>
            {profile.lastConnectionAt && (
              <div>
                <dt className="text-slate-500">Kiểm tra gần nhất</dt>
                <dd className={profile.lastConnectionOk ? "text-emerald-300" : "text-rose-300"}>
                  {profile.lastConnectionMessage}
                </dd>
              </div>
            )}
          </dl>
          <Link
            href="/erp/ke-toan/hoa-don-dien-tu"
            className="inline-block text-sm text-sky hover:underline"
          >
            ← Quay lại danh sách hóa đơn
          </Link>
        </div>
      )}

      {editing && (
        <div className="erp-card p-4 space-y-4">
          <p className="text-sm text-slate-400">
            Nhập tài khoản MobiFone Invoice. Hệ thống gọi API thật — không còn chế độ demo trừ khi
            server bật <code className="text-slate-300">MOBIFONE_INVOICE_FORCE_SIMULATE=1</code>.
          </p>

          <label className="block">
            <span className="text-sm text-slate-300">Tài khoản MobiFone</span>
            <input
              className="input-field mt-1 w-full"
              value={apiUsername}
              onChange={(e) => setApiUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">
              Mật khẩu MobiFone{profile?.hasApiPassword ? " (để trống nếu giữ mật khẩu cũ)" : ""}
            </span>
            <input
              type="password"
              className="input-field mt-1 w-full"
              value={apiPassword}
              onChange={(e) => setApiPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">URL API (tùy chọn)</span>
            <input
              className="input-field mt-1 w-full font-mono text-xs"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder={suggestedUrl || "https://…"}
            />
            <p className="text-xs text-slate-500 mt-1">
              Để trống = dùng URL MobiFone cấp hoặc mặc định theo MST (
              <span className="font-mono">{suggestedUrl}</span>).
            </p>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isTestMode}
              onChange={(e) => setIsTestMode(e.target.checked)}
              className="rounded border-white/20"
            />
            Môi trường kiểm thử ({MOBIFONE_TEST_DEFAULT_BASE})
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={testing || !apiUsername.trim()}
              className="quote-tool-btn text-sm !py-2"
            >
              <Radio size={14} className={testing ? "animate-pulse" : ""} />
              {testing ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !apiUsername.trim()}
              className="quote-tool-btn quote-tool-btn-primary text-sm !py-2"
            >
              {saving ? "Đang lưu…" : "Lưu cấu hình"}
            </button>
            {configured && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setApiPassword("");
                }}
                className="quote-tool-btn text-sm !py-2"
              >
                Hủy
              </button>
            )}
          </div>

          {testResult && (
            <div
              className={`text-sm rounded-lg px-3 py-2 border ${
                testResult.ok
                  ? "text-emerald-200 bg-emerald-500/10 border-emerald-500/30"
                  : "text-rose-200 bg-rose-500/10 border-rose-500/30"
              }`}
            >
              <p>{testResult.message}</p>
              {testResult.baseUrl && (
                <p className="text-xs mt-1 font-mono opacity-80">URL: {testResult.baseUrl}</p>
              )}
              {testResult.simulated ? (
                <p className="text-xs mt-1 text-amber-200">Chế độ mô phỏng trên server.</p>
              ) : null}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Hỗ trợ:{" "}
            <a href="mailto:support.minvoice@mobifone.vn" className="text-sky hover:underline">
              support.minvoice@mobifone.vn
            </a>{" "}
            · 18001290
          </p>
        </div>
      )}

      {message && <p className="text-sm text-emerald-300">{message}</p>}
      {error && (
        <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

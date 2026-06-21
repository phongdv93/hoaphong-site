"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Pencil, Radio } from "lucide-react";
import type { CustomsVnaccsProfile, SigningCertificateInfo } from "@/lib/customs/types";
import { AppSelect } from "@/components/ui/AppSelect";

export function VnaccsProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CustomsVnaccsProfile | null>(null);
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(true);
  const [taxCode, setTaxCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userCode, setUserCode] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [terminalAccessKey, setTerminalAccessKey] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [declarantName, setDeclarantName] = useState("");
  const [declarantPhone, setDeclarantPhone] = useState("");
  const [isTestMode, setIsTestMode] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    simulated?: boolean;
  } | null>(null);
  const [scanningCerts, setScanningCerts] = useState(false);
  const [certItems, setCertItems] = useState<SigningCertificateInfo[]>([]);
  const [agentStatus, setAgentStatus] = useState("");
  const [signingCertThumbprint, setSigningCertThumbprint] = useState("");
  const [signingCertSubject, setSigningCertSubject] = useState("");
  const [signingCertIssuer, setSigningCertIssuer] = useState("");
  const [signingProvider, setSigningProvider] = useState("");
  const [signingTestBusy, setSigningTestBusy] = useState(false);
  const [signingTestResult, setSigningTestResult] = useState("");
  const firstScanDoneRef = useRef(false);

  const scanCertificates = useCallback(async (preferredThumbprint = "") => {
    setScanningCerts(true);
    const res = await fetch("/api/customs/agent/certificates");
    const j = await res.json().catch(() => ({}));
    setScanningCerts(false);
    if (!res.ok) {
      setAgentStatus(j.error || "Không quét được token/certificate");
      setCertItems([]);
      setSigningTestResult(j.error || "Quét cert thất bại.");
      return;
    }
    setAgentStatus(j.health?.message || "");
    const items = (j.items || []) as SigningCertificateInfo[];
    setCertItems(items);
    if (items.length === 0) {
      setSigningTestResult(
        "Quét xong nhưng không thấy cert private key trong CurrentUser\\My. Kiểm tra middleware token."
      );
    } else {
      setSigningTestResult(`Đã quét ${items.length} cert. Hãy chọn cert rồi bấm Lưu.`);
    }
    if (!preferredThumbprint && items.length) {
      const first = items[0];
      setSigningCertThumbprint(first.thumbprint);
      setSigningCertSubject(first.subject);
      setSigningCertIssuer(first.issuer);
      setSigningProvider(first.provider);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/customs/profile");
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Không tải được cấu hình");
      setLoading(false);
      return;
    }
    const defaults = j.companyDefaults as { taxCode?: string; companyName?: string } | null;
    if (j.profile) {
      const p = j.profile as CustomsVnaccsProfile;
      setProfile(p);
      setTaxCode(p.taxCode);
      setCompanyName(p.companyName);
      setUserCode(p.userCode);
      setTerminalId(p.terminalId);
      setGatewayUrl(p.gatewayUrl || "");
      setDeclarantName(p.declarantName);
      setDeclarantPhone(p.declarantPhone);
      setIsTestMode(p.isTestMode);
      setSigningCertThumbprint(p.signingCertThumbprint || "");
      setSigningCertSubject(p.signingCertSubject || "");
      setSigningCertIssuer(p.signingCertIssuer || "");
      setSigningProvider(p.signingProvider || "");
    } else if (defaults) {
      setTaxCode(defaults.taxCode ?? "");
      setCompanyName(defaults.companyName ?? "");
    }
    const isConfigured = Boolean(j.configured);
    setConfigured(isConfigured);
    setEditing(!isConfigured);
    setLoading(false);
    if (!firstScanDoneRef.current) {
      firstScanDoneRef.current = true;
      void scanCertificates(j.profile?.signingCertThumbprint || "");
    }
  }, [scanCertificates]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const isFirst = !configured && !profile?.hasUserPassword;
    if (isFirst && (!userPassword.trim() || !terminalAccessKey.trim())) {
      setError("Lần đầu phải nhập đủ Password và Terminal Access Key.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/customs/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxCode,
        companyName,
        userCode,
        userPassword: userPassword.trim() || undefined,
        terminalId,
        terminalAccessKey: terminalAccessKey.trim() || undefined,
        gatewayUrl,
        declarantName,
        declarantPhone,
        isTestMode,
        signingCertThumbprint,
        signingCertSubject,
        signingCertIssuer,
        signingProvider,
      }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(j.error || "Lưu thất bại");
      return;
    }
    setProfile(j.profile);
    setConfigured(true);
    setEditing(false);
    setUserPassword("");
    setTerminalAccessKey("");
    setMessage(j.message || "Đã lưu vĩnh viễn vào database.");
    void runTestConnection();
  }

  async function saveSelectedCertOnly() {
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/customs/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxCode,
        companyName,
        userCode,
        terminalId,
        gatewayUrl,
        declarantName,
        declarantPhone,
        isTestMode,
        signingCertThumbprint,
        signingCertSubject,
        signingCertIssuer,
        signingProvider,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(j.error || "Lưu cert thất bại");
      return;
    }
    setProfile(j.profile as CustomsVnaccsProfile);
    setMessage("Đã lưu cert ký số cho công ty.");
  }

  async function runTestConnection() {
    setTesting(true);
    setTestResult(null);
    setError("");
    const res = await fetch("/api/customs/profile/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userCode,
        terminalId,
        gatewayUrl,
        isTestMode,
        userPassword: userPassword.trim() || undefined,
        terminalAccessKey: terminalAccessKey.trim() || undefined,
      }),
    });
    const j = await res.json();
    setTesting(false);
    if (!res.ok) {
      setTestResult({ ok: false, message: j.error || "Test thất bại" });
      return;
    }
    setTestResult(j);
    if (res.ok) void load();
  }

  async function runSigningTest() {
    if (!signingCertThumbprint) {
      setSigningTestResult("Chưa chọn chứng thư để ký thử.");
      return;
    }
    setSigningTestBusy(true);
    setSigningTestResult("");
    const res = await fetch("/api/customs/agent/sign-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbprint: signingCertThumbprint }),
    });
    const j = await res.json().catch(() => ({}));
    setSigningTestBusy(false);
    if (!res.ok) {
      setSigningTestResult(j.error || "Ký thử thất bại.");
      return;
    }
    setSigningTestResult(j.message || "Ký thử thành công.");
  }

  if (loading) return <p className="text-slate-400 text-sm">Đang tải…</p>;

  function certLabel(cert: SigningCertificateInfo): string {
    const compactSubject = cert.subject
      .replace("OID.0.9.2342.19200300.100.1.1=", "MST:")
      .replace(/\s+/g, " ")
      .trim();
    const shortSubject =
      compactSubject.length > 72 ? `${compactSubject.slice(0, 72)}...` : compactSubject;
    return `${shortSubject} | ${cert.provider}`;
  }

  const certOptions = [
    { value: "", label: "-- Chưa chọn --" },
    ...certItems.map((cert) => ({ value: cert.thumbprint, label: certLabel(cert) })),
  ];

  function applySelectedCert(value: string) {
    const selected = certItems.find((c) => c.thumbprint === value);
    setSigningCertThumbprint(value);
    setSigningCertSubject(selected?.subject ?? "");
    setSigningCertIssuer(selected?.issuer ?? "");
    setSigningProvider(selected?.provider ?? "");
  }

  const testResultBlock = testResult && (
    <p
      className={`text-xs ${testResult.ok ? "text-emerald-300" : "text-rose-300"}`}
    >
      {testResult.simulated && (
        <span className="text-slate-400">[Mô phỏng] </span>
      )}
      {testResult.message}
    </p>
  );

  if (configured && !editing && profile) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={22} />
            <div>
              <p className="font-medium text-emerald-100">Đã lưu — dùng cho mọi tờ khai</p>
              <p className="text-xs text-slate-400 mt-1">
                Cấu hình gắn với công ty đang chọn trong database. Không cần nhập lại mỗi lần
                khai báo.
              </p>
              <dl className="mt-3 text-xs text-slate-300 space-y-1 font-mono">
                <div>MST: {profile.taxCode}</div>
                <div>User: {profile.userCode}</div>
                <div>Terminal: {profile.terminalId}</div>
                <div>Password / Access key: đã mã hóa lưu DB</div>
                {profile.gatewayUrl && <div>Gateway: {profile.gatewayUrl}</div>}
                {profile.signingCertThumbprint && (
                  <div>Cert: {profile.signingCertSubject || profile.signingCertThumbprint}</div>
                )}
              </dl>
              {profile.updatedAt && (
                <p className="text-[10px] text-slate-500 mt-2">
                  Cập nhật: {new Date(profile.updatedAt).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-300 font-medium">USB Token / Chứng thư ký số</p>
            <button
              type="button"
              disabled={scanningCerts}
              onClick={() => void scanCertificates(signingCertThumbprint)}
              className="text-xs border border-white/20 px-2 py-1 rounded text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              {scanningCerts ? "Đang quét..." : "Quét lại cert"}
            </button>
          </div>
          {agentStatus && <p className="text-[11px] text-emerald-300">{agentStatus}</p>}
          <p className="text-[11px] text-slate-500">Số cert quét được: {certItems.length}</p>
          <Field label="Chọn cert đang dùng">
            <AppSelect
              className="w-full rounded-lg border border-sky/40 bg-[#081a3a] text-slate-100 text-sm px-3 py-2 text-left flex items-center justify-between"
              value={signingCertThumbprint}
              onChange={applySelectedCert}
              options={certOptions}
            />
          </Field>
          <button
            type="button"
            disabled={saving || !signingCertThumbprint}
            onClick={() => void saveSelectedCertOnly()}
            className="text-xs border border-sky/40 text-sky-light px-2 py-1 rounded hover:bg-sky/10 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu cert này"}
          </button>
          <p className="text-[11px] text-slate-500">
            Cert hiện lưu theo công ty: {profile.signingCertSubject || profile.signingCertThumbprint || "Chưa chọn"}
          </p>
          <button
            type="button"
            disabled={signingTestBusy || !profile.signingCertThumbprint}
            onClick={() => void runSigningTest()}
            className="text-xs border border-emerald-500/40 text-emerald-200 px-2 py-1 rounded hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {signingTestBusy ? "Đang ký thử..." : "Ký thử token"}
          </button>
          {signingTestResult && (
            <p className="text-[11px] text-slate-400">{signingTestResult}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            disabled={testing}
            onClick={() => void runTestConnection()}
            className="inline-flex items-center gap-2 text-sm bg-white/10 hover:bg-white/15 text-white px-3 py-2 rounded-lg disabled:opacity-50"
          >
            <Radio size={14} className={testing ? "animate-pulse" : ""} />
            {testing ? "Đang test…" : "Test kết nối HQ"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 text-sm text-sky-light hover:underline"
          >
            <Pencil size={14} /> Chỉnh sửa
          </button>
        </div>
        {profile.lastConnectionAt && (
          <p className="text-[10px] text-slate-500">
            Lần test gần nhất:{" "}
            {new Date(profile.lastConnectionAt).toLocaleString("vi-VN")}
            {profile.lastConnectionMessage && ` — ${profile.lastConnectionMessage}`}
          </p>
        )}
        {testResultBlock}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4 max-w-lg">
      {!configured && (
        <p className="text-sm text-slate-400">
          Nhập <strong className="text-slate-200">một lần</strong> — hệ thống lưu vào database
          theo công ty. Lần sau mở lại không cần gõ lại (mật khẩu được giữ an toàn).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="MST doanh nghiệp">
          <input
            className="input-field text-sm"
            value={taxCode}
            onChange={(e) => setTaxCode(e.target.value)}
            required
          />
        </Field>
        <Field label="Tên DN">
          <input
            className="input-field text-sm"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </Field>
        <Field label="User Code">
          <input
            className="input-field text-sm font-mono"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            required
          />
        </Field>
        <Field label="Terminal ID">
          <input
            className="input-field text-sm font-mono"
            value={terminalId}
            onChange={(e) => setTerminalId(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Password VNACCS"
          hint={
            profile?.hasUserPassword
              ? "Để trống = giữ mật khẩu đã lưu"
              : "Bắt buộc lần đầu"
          }
        >
          <input
            type="password"
            className="input-field text-sm"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            placeholder={profile?.hasUserPassword ? "••••••••" : ""}
            autoComplete="new-password"
          />
        </Field>
        <Field
          label="Terminal Access Key"
          hint={
            profile?.hasTerminalAccessKey
              ? "Để trống = giữ key đã lưu"
              : "Bắt buộc lần đầu"
          }
        >
          <input
            type="password"
            className="input-field text-sm"
            value={terminalAccessKey}
            onChange={(e) => setTerminalAccessKey(e.target.value)}
            placeholder={profile?.hasTerminalAccessKey ? "••••••••" : ""}
            autoComplete="new-password"
          />
        </Field>
      </div>

      <Field label="URL Gateway (tuỳ chọn — lưu theo công ty)">
        <input
          className="input-field text-sm font-mono"
          value={gatewayUrl}
          onChange={(e) => setGatewayUrl(e.target.value)}
          placeholder="https://gateway-doi-tac.example/v1"
        />
      </Field>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-200">Chứng thư ký số (USB Token)</p>
          <button
            type="button"
            disabled={scanningCerts}
            onClick={() => void scanCertificates(signingCertThumbprint)}
            className="text-xs border border-white/20 px-2 py-1 rounded text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            {scanningCerts ? "Đang quét..." : "Quét cert đang gắn"}
          </button>
        </div>
        {agentStatus && <p className="text-[11px] text-emerald-300">{agentStatus}</p>}
        <Field label="Chọn cert để ký (theo công ty)">
          <AppSelect
            className="w-full rounded-lg border border-sky/40 bg-[#081a3a] text-slate-100 text-sm px-3 py-2 text-left flex items-center justify-between"
            value={signingCertThumbprint}
            onChange={applySelectedCert}
            options={certOptions}
          />
        </Field>
        {!!signingCertThumbprint && (
          <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
            <div>Thumbprint: {signingCertThumbprint}</div>
            <div>Issuer: {signingCertIssuer || "—"}</div>
            <div>Provider: {signingProvider || "—"}</div>
          </div>
        )}
        <button
          type="button"
          disabled={signingTestBusy || !signingCertThumbprint}
          onClick={() => void runSigningTest()}
          className="text-xs border border-emerald-500/40 text-emerald-200 px-2 py-1 rounded hover:bg-emerald-500/10 disabled:opacity-50"
        >
          {signingTestBusy ? "Đang ký thử..." : "Ký thử token (XML test)"}
        </button>
        {signingTestResult && (
          <p className="text-[11px] text-slate-400">{signingTestResult}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Người khai HQ">
          <input
            className="input-field text-sm"
            value={declarantName}
            onChange={(e) => setDeclarantName(e.target.value)}
          />
        </Field>
        <Field label="SĐT">
          <input
            className="input-field text-sm"
            value={declarantPhone}
            onChange={(e) => setDeclarantPhone(e.target.value)}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={isTestMode}
          onChange={(e) => setIsTestMode(e.target.checked)}
        />
        Chế độ thử (khi chưa có gateway thật)
      </label>

      {error && <p className="text-xs text-rose-300">{error}</p>}
      {message && <p className="text-xs text-emerald-300">{message}</p>}

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="submit"
          disabled={saving}
          className="bg-sky text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-light disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : configured ? "Cập nhật & lưu DB" : "Lưu một lần — dùng mãi"}
        </button>
        <button
          type="button"
          disabled={testing || saving}
          onClick={() => void runTestConnection()}
          className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
        >
          <Radio size={14} className={testing ? "animate-pulse" : ""} />
          {testing ? "Đang test…" : "Test kết nối"}
        </button>
        {configured && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="border border-white/20 px-4 py-2 rounded-lg text-sm text-slate-300"
          >
            Hủy
          </button>
        )}
      </div>
      {testResultBlock}
    </form>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400 mb-1 block">{label}</span>
      {hint && <span className="text-[10px] text-slate-500 block mb-0.5">{hint}</span>}
      {children}
    </label>
  );
}

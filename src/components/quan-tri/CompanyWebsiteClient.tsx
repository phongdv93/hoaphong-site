"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Globe, Link2, Save } from "lucide-react";

export function CompanyWebsiteClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/companies/website");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tải được thông tin website");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCompanyName(data.companyName ?? "");
    setWebsiteUrl(data.websiteUrl ?? "");
    setPublicUrl(data.publicUrl ?? null);
    setLinked(Boolean(data.linked));
    setCanEdit(Boolean(data.canEdit));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/companies/website", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteUrl }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setPublicUrl(data.publicUrl ?? null);
      setLinked(Boolean(data.linked));
      setWebsiteUrl(data.websiteUrl ?? "");
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Lưu thất bại");
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-400">Đang tải…</div>;
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="erp-card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Globe className="text-sky shrink-0 mt-0.5" size={22} />
          <div>
            <h2 className="font-semibold text-white">Website công ty</h2>
            <p className="text-sm text-slate-400 mt-1">
              Liên kết website giới thiệu của <strong className="text-slate-200">{companyName}</strong>.
              Đây <em>không phải</em> trang quản trị Hoa Phong.
            </p>
          </div>
        </div>

        {linked && publicUrl ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
            <p className="text-emerald-200 font-medium mb-2">Đã liên kết website</p>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sky-light hover:underline font-mono text-xs break-all"
            >
              {publicUrl}
              <ExternalLink size={14} />
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-medium">Chưa liên kết website công ty</p>
            <p className="text-xs text-amber-200/80 mt-1">
              Admin công ty nhập URL website (domain riêng hoặc trang landing) bên dưới.
              CMS nội dung theo từng công ty sẽ bổ sung sau.
            </p>
          </div>
        )}
      </div>

      {canEdit ? (
        <form onSubmit={save} className="erp-card p-5 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Link2 size={12} /> URL website công ty
            </span>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://congty.vn hoặc www.congty.vn"
              className="input-field w-full font-mono text-xs"
            />
          </label>
          <p className="text-[11px] text-slate-500">
            Để trống nếu chưa có website. Nhân viên sẽ thấy thông báo &quot;chưa liên kết&quot;.
          </p>
          {error && <p className="text-rose-300 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-sky text-white px-4 py-2 rounded-lg hover:bg-sky-light disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Đang lưu…" : "Lưu liên kết"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-500">
          Chỉ <strong className="text-slate-400">admin công ty</strong> được cấu hình URL website.
        </p>
      )}

      <p className="text-xs text-slate-500">
        Quản lý quyền truy cập ERP:{" "}
        <Link href="/erp/quan-tri/phan-quyen" className="text-sky-light hover:underline">
          Phân quyền
        </Link>
        {" · "}
        <Link href="/erp/hr/nhan-su" className="text-sky-light hover:underline">
          HR → Nhân sự
        </Link>
      </p>
    </div>
  );
}

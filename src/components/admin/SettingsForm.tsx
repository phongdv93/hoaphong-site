"use client";

import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/types";
import { Save } from "lucide-react";

export function SettingsForm() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setMsg(res.ok ? "Đã lưu thành công!" : "Lỗi khi lưu");
  }

  if (!settings) return <p className="text-gray-500">Đang tải...</p>;

  const fields: { key: keyof SiteSettings; label: string; rows?: number }[] = [
    { key: "companyName", label: "Tên công ty" },
    { key: "tagline", label: "Slogan" },
    { key: "description", label: "Mô tả ngắn", rows: 2 },
    { key: "heroTitle", label: "Tiêu đề Hero" },
    { key: "heroSubtitle", label: "Phụ đề Hero", rows: 2 },
    { key: "aboutTitle", label: "Tiêu đề Giới thiệu" },
    { key: "aboutContent", label: "Nội dung Giới thiệu", rows: 4 },
    { key: "email", label: "Email" },
    { key: "phone", label: "Điện thoại" },
    { key: "address", label: "Địa chỉ", rows: 2 },
    { key: "facebook", label: "Facebook URL" },
    { key: "linkedin", label: "LinkedIn URL" },
    { key: "zalo", label: "Zalo" },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          {f.rows ? (
            <textarea
              rows={f.rows}
              value={settings[f.key]}
              onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald/30 focus:border-emerald"
            />
          ) : (
            <input
              value={settings[f.key]}
              onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald/30 focus:border-emerald"
            />
          )}
        </div>
      ))}
      {msg && <p className={`text-sm ${msg.includes("thành công") ? "text-emerald" : "text-red-500"}`}>{msg}</p>}
      <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-60">
        <Save size={16} /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
      </button>
    </form>
  );
}

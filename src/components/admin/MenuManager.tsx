"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import type { NavMenuItem } from "@/lib/nav-menu";

function newItem(sortOrder: number): NavMenuItem {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    href: "/",
    label: "Menu mới",
    visible: true,
    sortOrder,
  };
}

export function MenuManager() {
  const [items, setItems] = useState<NavMenuItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/nav-menu")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []));
  }, []);

  function patch(id: string, patch: Partial<NavMenuItem>) {
    setItems((prev) => prev?.map((it) => (it.id === id ? { ...it, ...patch } : it)) ?? null);
  }

  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((it) => it.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((it, i) => ({ ...it, sortOrder: i }));
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!items) return;
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/settings/nav-menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setItems(j.items ?? items);
      setMsg("Đã lưu menu!");
    } else {
      setMsg(typeof j.error === "string" ? j.error : "Lỗi khi lưu");
    }
  }

  if (!items) return <p className="text-slate-400">Đang tải…</p>;

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-400">
        Menu hiển thị trên header website công khai. Bật/tắt, đổi tên, thêm mục mới (đường dẫn bắt đầu bằng{" "}
        <code className="text-sky-light">/</code>).
      </p>

      <ul className="space-y-2">
        {items.map((it, index) => (
          <li
            key={it.id}
            className={`erp-card p-3 flex flex-wrap items-center gap-2 ${
              !it.visible ? "opacity-60" : ""
            }`}
          >
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(it.id, -1)}
                className="text-[10px] text-slate-500 hover:text-white disabled:opacity-30 px-1"
                title="Lên"
              >
                ▲
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => move(it.id, 1)}
                className="text-[10px] text-slate-500 hover:text-white disabled:opacity-30 px-1"
                title="Xuống"
              >
                ▼
              </button>
            </div>

            <input
              value={it.label}
              onChange={(e) => patch(it.id, { label: e.target.value })}
              placeholder="Tên menu"
              className="flex-1 min-w-[8rem] px-2 py-1.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white"
            />
            <input
              value={it.href}
              onChange={(e) => patch(it.id, { href: e.target.value })}
              placeholder="/duong-dan"
              className="flex-1 min-w-[8rem] px-2 py-1.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white font-mono"
            />

            <button
              type="button"
              onClick={() => patch(it.id, { visible: !it.visible })}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border ${
                it.visible
                  ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                  : "border-white/20 text-slate-400 bg-white/5"
              }`}
              title={it.visible ? "Đang hiển thị" : "Đang ẩn"}
            >
              {it.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              {it.visible ? "Hiện" : "Ẩn"}
            </button>

            <button
              type="button"
              onClick={() => setItems((prev) => prev?.filter((x) => x.id !== it.id) ?? null)}
              className="shrink-0 p-1.5 text-rose-400 hover:text-rose-300"
              title="Xóa mục"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setItems((prev) => [...(prev ?? []), newItem(prev?.length ?? 0)])}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/20 text-sm text-slate-200 hover:bg-white/10"
        >
          <Plus size={16} /> Thêm menu
        </button>
        <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-60">
          <Save size={16} /> {saving ? "Đang lưu…" : "Lưu menu"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.includes("lưu") ? "text-emerald-400" : "text-rose-400"}`}>
            {msg}
          </span>
        )}
      </div>
    </form>
  );
}

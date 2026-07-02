"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import type { Supplier } from "@/lib/suppliers/types";

export function SuppliersClient({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const [q, setQ] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Supplier>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = q.trim()
        ? `/api/suppliers?q=${encodeURIComponent(q.trim())}`
        : "/api/suppliers";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Không tải được danh sách NCC");
      const j = await res.json();
      setSuppliers(j.items ?? j.suppliers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function addSupplier() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Không thêm được");
      setNewName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setDraft({ ...s });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/suppliers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          contactName: draft.contactName,
          phone: draft.phone,
          email: draft.email,
          address: draft.address,
          notes: draft.notes,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Không lưu được");
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Tìm NCC…"
          className="input-field py-1.5 text-sm max-w-xs flex-1 min-w-[12rem]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading && <span className="text-xs text-slate-500">Đang lọc…</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="input-field py-1.5 text-sm flex-1 min-w-[12rem]"
          placeholder="Tên NCC mới"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addSupplier()}
        />
        <button
          type="button"
          disabled={saving || !newName.trim()}
          onClick={() => void addSupplier()}
          className="btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1"
        >
          <Plus size={14} /> Thêm
        </button>
      </div>

      <div className="erp-table-wrap overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="erp-table-head">
            <tr>
              <th className="px-3 py-2 text-left">Tên NCC</th>
              <th className="px-3 py-2 text-left">Liên hệ</th>
              <th className="px-3 py-2 text-left">Điện thoại</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Địa chỉ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Chưa có nhà cung cấp.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => {
                const edit = editingId === s.id;
                return (
                  <tr key={s.id} className="erp-table-row">
                    <td className="px-3 py-2">
                      {edit ? (
                        <input
                          className="input-field py-1 text-xs w-full"
                          value={draft.name ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        />
                      ) : (
                        <span className="font-medium text-white">{s.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {edit ? (
                        <input
                          className="input-field py-1 text-xs w-full"
                          value={draft.contactName ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                        />
                      ) : (
                        s.contactName || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {edit ? (
                        <input
                          className="input-field py-1 text-xs w-full"
                          value={draft.phone ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                        />
                      ) : (
                        s.phone || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {edit ? (
                        <input
                          className="input-field py-1 text-xs w-full"
                          value={draft.email ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                        />
                      ) : (
                        s.email || "—"
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[12rem]">
                      {edit ? (
                        <input
                          className="input-field py-1 text-xs w-full"
                          value={draft.address ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                        />
                      ) : (
                        <span className="truncate block">{s.address || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {edit ? (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveEdit()}
                            className="text-sky text-xs hover:underline inline-flex items-center gap-1"
                          >
                            <Save size={12} /> Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-slate-500 text-xs hover:underline ml-2"
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="text-sky text-xs hover:underline"
                        >
                          Sửa
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "checkbox" | "number" | "select";
  options?: string[];
  rows?: number;
};

type CrudManagerProps = {
  apiPath: string;
  title: string;
  fields: Field[];
  defaultItem: Record<string, unknown>;
};

export function CrudManager({ apiPath, title, fields, defaultItem }: CrudManagerProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`${apiPath}?admin=1`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [apiPath]);

  async function save() {
    if (!editing) return;
    const isNew = !editing.id;
    const url = isNew ? apiPath : `${apiPath}/${editing.id}`;
    const method = isNew ? "POST" : "PUT";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Xóa mục này?")) return;
    await fetch(`${apiPath}/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">{items.length} mục</p>
        <button
          type="button"
          onClick={() => setEditing({ ...defaultItem })}
          className="btn-primary text-sm py-2"
        >
          <Plus size={16} /> Thêm {title}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tên</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id as number} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{item.id as number}</td>
                  <td className="px-4 py-3 font-medium">
                    {(item.title as string) || (item.name as string)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="p-1.5 rounded-lg hover:bg-emerald/10 text-emerald"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id as number)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xl font-bold">
                {editing.id ? "Chỉnh sửa" : "Thêm mới"}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      rows={f.rows || 3}
                      value={String(editing[f.key] ?? "")}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald/30"
                    />
                  ) : f.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(editing[f.key])}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                      className="w-4 h-4"
                    />
                  ) : f.type === "number" ? (
                    <input
                      type="number"
                      value={Number(editing[f.key] ?? 0)}
                      onChange={(e) => setEditing({ ...editing, [f.key]: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  ) : (
                    <input
                      value={String(editing[f.key] ?? "")}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald/30"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={save} className="btn-primary text-sm flex-1">
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-outline text-sm flex-1"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

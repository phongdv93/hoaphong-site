"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  CUSTOMER_TYPE_LABELS,
  type Customer,
  type CustomerType,
} from "@/lib/marketing/customer-types";
import { AppSelect } from "@/components/ui/AppSelect";

const empty: Omit<Customer, "id" | "createdAt" | "updatedAt"> = {
  code: "",
  name: "",
  type: "le",
  taxCode: "",
  phone: "",
  email: "",
  address: "",
  contactPerson: "",
  contactPhone: "",
  notes: "",
  status: "active",
};

export function CustomerManager() {
  const [items, setItems] = useState<Customer[]>([]);
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/customers");
      if (!res.ok) throw new Error("Không tải được danh sách");
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!editing?.name?.trim()) return;
    const isNew = !editing.id;
    const url = isNew ? "/api/marketing/customers" : `/api/marketing/customers/${editing.id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Lưu thất bại");
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Xóa khách hàng này?")) return;
    await fetch(`/api/marketing/customers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-midnight/60 text-sm">{items.length} khách hàng</p>
        <button
          type="button"
          onClick={() => setEditing({ ...empty })}
          className="btn-primary text-sm py-2"
        >
          <Plus size={16} /> Thêm khách hàng
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-midnight/50">Đang tải...</p>
      ) : (
        <div className="bg-white rounded-xl border border-navy/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-mist text-left">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Điện thoại</th>
                <th className="px-4 py-3">Liên hệ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-midnight/50">
                    Chưa có khách hàng. Bấm &quot;Thêm khách hàng&quot; hoặc chạy{" "}
                    <code className="text-sky">npm run db:seed</code>
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="border-t border-navy/5 hover:bg-mist/40">
                    <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                    <td className="px-4 py-3 font-medium text-navy">{c.name}</td>
                    <td className="px-4 py-3">{CUSTOMER_TYPE_LABELS[c.type]}</td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="px-4 py-3">{c.contactPerson || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          c.status === "active" ? "bg-emerald/10 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.status === "active" ? "Hoạt động" : "Ngưng"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="p-1.5 rounded-lg hover:bg-sky/10 text-sky"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-navy">{editing.id ? "Sửa khách hàng" : "Thêm khách hàng"}</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 hover:bg-mist rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <Field label="Mã (để trống = tự sinh KH-0001)">
                <input
                  value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  className="input-field"
                  placeholder="KH-0001"
                />
              </Field>
              <Field label="Tên khách hàng *">
                <input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Loại">
                <AppSelect
                  variant="light"
                  value={editing.type ?? "le"}
                  onChange={(v) => setEditing({ ...editing, type: v as CustomerType })}
                  className="input-field"
                  options={(Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[]).map((k) => ({
                    value: k,
                    label: CUSTOMER_TYPE_LABELS[k],
                  }))}
                />
              </Field>
              <Field label="Mã số thuế">
                <input
                  value={editing.taxCode ?? ""}
                  onChange={(e) => setEditing({ ...editing, taxCode: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Điện thoại">
                <input
                  value={editing.phone ?? ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Email">
                <input
                  value={editing.email ?? ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Địa chỉ">
                <textarea
                  rows={2}
                  value={editing.address ?? ""}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Người liên hệ">
                <input
                  value={editing.contactPerson ?? ""}
                  onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="SĐT liên hệ">
                <input
                  value={editing.contactPhone ?? ""}
                  onChange={(e) => setEditing({ ...editing, contactPhone: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Ghi chú">
                <textarea
                  rows={2}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="input-field"
                />
              </Field>
              <Field label="Trạng thái">
                <AppSelect
                  variant="light"
                  value={editing.status ?? "active"}
                  onChange={(v) => setEditing({ ...editing, status: v as Customer["status"] })}
                  className="input-field"
                  options={[
                    { value: "active", label: "Hoạt động" },
                    { value: "inactive", label: "Ngưng" },
                  ]}
                />
              </Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={save} className="btn-primary text-sm flex-1">
                Lưu
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn-outline text-sm flex-1">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-medium text-midnight/70 mb-1">{label}</label>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/marketing/customer-types";
import { AppSelect } from "@/components/ui/AppSelect";
import { ErpDateInput } from "@/components/erp/ErpDateInput";

export function ProjectCreateForm({
  customers,
  onCreated,
  onCancel,
  embedded,
}: {
  customers: Customer[];
  onCreated?: (projectId: number) => void;
  onCancel?: () => void;
  /** Form trong right panel — bỏ card wrapper rộng */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [supplierAddress, setSupplierAddress] = useState("");
  const [exportCountry, setExportCountry] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [contractSignedAt, setContractSignedAt] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [seedPhases, setSeedPhases] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code.trim(),
          customerId,
          supplierAddress,
          exportCountry,
          contractValue: Number(contractValue.replace(/[^\d]/g, "")) || 0,
          contractSignedAt: contractSignedAt || null,
          startDate: startDate || null,
          expectedEndDate: expectedEndDate || null,
          address,
          notes,
          seedPhases,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra");
        return;
      }
      if (onCreated) {
        onCreated(data.id);
      } else {
        router.push(`/erp/du-an?p=${data.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi mạng");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className={
        embedded
          ? "space-y-4 max-w-none"
          : "erp-card rounded-xl p-6 max-w-3xl space-y-4"
      }
    >
      <Row label="Tên dự án *">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          placeholder="VD: Biệt thự Vinhomes Q9"
        />
      </Row>
      <Row label="Mã dự án (PI / HĐ) *">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="input-field font-mono"
          placeholder="VD: PI-2026-0142 hoặc số hợp đồng"
        />
      </Row>
      <div className="grid grid-cols-2 gap-4">
        <Row label="Khách hàng">
          <AppSelect
            value={String(customerId ?? "")}
            onChange={(v) => setCustomerId(v ? Number(v) : null)}
            className="input-field w-full text-left flex items-center justify-between"
            options={[
              { value: "", label: "— Không gắn —" },
              ...customers.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
        </Row>
        <Row label="Giá hợp đồng (VND)">
          <input
            value={contractValue}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, "");
              setContractValue(
                raw ? new Intl.NumberFormat("vi-VN").format(Number(raw)) : ""
              );
            }}
            inputMode="numeric"
            className="input-field text-right tabular-nums"
            placeholder="0"
          />
        </Row>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Row label="Ngày ký HĐ">
          <ErpDateInput
            value={contractSignedAt}
            onChange={setContractSignedAt}
            className="text-sm"
          />
        </Row>
        <Row label="Ngày khởi công">
          <ErpDateInput value={startDate} onChange={setStartDate} className="text-sm" />
        </Row>
        <Row label="Dự kiến hoàn thành">
          <ErpDateInput
            value={expectedEndDate}
            onChange={setExpectedEndDate}
            className="text-sm"
          />
        </Row>
      </div>
      <Row label="Địa chỉ công trình">
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-field" />
      </Row>
      <Row label="Địa chỉ cung cấp hàng">
        <input
          value={supplierAddress}
          onChange={(e) => setSupplierAddress(e.target.value)}
          className="input-field"
          placeholder="Kho / nhà máy / NCC"
        />
      </Row>
      <Row label="Nước xuất khẩu">
        <input
          value={exportCountry}
          onChange={(e) => setExportCountry(e.target.value)}
          className="input-field"
          placeholder="VD: Mỹ, Úc, Nhật…"
        />
      </Row>
      <Row label="Ghi chú">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input"
        />
      </Row>
      <label className="flex items-center gap-2 text-sm pt-2">
        <input
          type="checkbox"
          checked={seedPhases}
          onChange={(e) => setSeedPhases(e.target.checked)}
        />
        Tự sinh 7 công đoạn mặc định (Thiết kế · Bản vẽ · Xây thô · Hoàn thiện · MEP · Nội thất ·
        Cảnh quan)
      </label>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : router.back())}
          className="px-4 py-2 rounded-lg border border-white/20 text-sm text-slate-300 hover:bg-white/10"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-sky text-white px-5 py-2 rounded-lg text-sm hover:bg-sky-light disabled:opacity-50"
        >
          {submitting ? "Đang tạo…" : "Tạo dự án"}
        </button>
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-300/70 mb-1">{label}</span>
      {children}
    </label>
  );
}

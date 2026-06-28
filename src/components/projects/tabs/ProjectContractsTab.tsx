"use client";

import { useState } from "react";
import { FileSignature, Plus, Trash2 } from "lucide-react";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import { AppSelect } from "@/components/ui/AppSelect";
import type { ProjectContract, ProjectContractStatus } from "@/lib/projects/types";

const STATUS_LABELS: Record<ProjectContractStatus, string> = {
  draft: "Nháp",
  signed: "Đã ký",
  active: "Đang thực hiện",
  closed: "Đã đóng",
  cancelled: "Đã hủy",
};

function formatMoney(n: number): string {
  if (!n) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
}

export function ProjectContractsTab({
  projectId,
  contracts,
  canEdit,
  onChanged,
}: {
  projectId: number;
  contracts: ProjectContract[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [contractNo, setContractNo] = useState("");
  const [title, setTitle] = useState("");
  const [partyName, setPartyName] = useState("");
  const [value, setValue] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [status, setStatus] = useState<ProjectContractStatus>("draft");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createContract() {
    if (!contractNo.trim()) {
      setError("Số hợp đồng bắt buộc");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractNo: contractNo.trim(),
        title,
        partyName,
        value: Number(value.replace(/\D/g, "")) || 0,
        signedAt: signedAt || null,
        status,
        notes,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Không tạo được");
      return;
    }
    setContractNo("");
    setTitle("");
    setPartyName("");
    setValue("");
    setSignedAt("");
    setStatus("draft");
    setNotes("");
    setShowForm(false);
    onChanged();
  }

  async function updateField(
    contractId: number,
    patch: Record<string, unknown>
  ) {
    const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) onChanged();
  }

  async function removeContract(contractId: number) {
    if (!confirm("Xóa hợp đồng này?")) return;
    const res = await fetch(`/api/projects/${projectId}/contracts/${contractId}`, {
      method: "DELETE",
    });
    if (res.ok) onChanged();
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500">
        Quản lý hợp đồng / phụ lục gắn với dự án — phù hợp dự án PI và kinh doanh.
      </p>

      {canEdit && (
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 px-3 h-[30px] rounded-lg border border-white/15 text-xs text-slate-200 hover:bg-white/10"
        >
          <Plus size={14} /> Thêm hợp đồng
        </button>
      )}

      {showForm && canEdit && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <Field label="Số HĐ *" value={contractNo} onChange={setContractNo} />
          <Field label="Tiêu đề" value={title} onChange={setTitle} />
          <Field label="Đối tác / khách" value={partyName} onChange={setPartyName} />
          <Field label="Giá trị (VND)" value={value} onChange={setValue} inputMode="numeric" />
          <div>
            <label className="block text-[10px] uppercase text-slate-500 mb-1">Ngày ký</label>
            <ErpDateInput value={signedAt} onChange={setSignedAt} className="text-xs !h-[30px]" />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-slate-500 mb-1">Trạng thái</label>
            <AppSelect
              value={status}
              onChange={(v) => setStatus(v as ProjectContractStatus)}
              className="input-field text-xs w-full text-left flex items-center justify-between !h-[30px]"
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <Field label="Ghi chú" value={notes} onChange={setNotes} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void createContract()}
            className="bg-sky text-white px-4 py-1.5 rounded-lg text-xs hover:bg-sky-light disabled:opacity-50"
          >
            {busy ? "Đang lưu…" : "Lưu hợp đồng"}
          </button>
        </div>
      )}

      {!contracts.length ? (
        <p className="text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-lg text-xs">
          Chưa có hợp đồng — thêm khi cần theo dõi số HĐ và giá trị.
        </p>
      ) : (
        <ul className="space-y-2">
          {contracts.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <FileSignature size={16} className="text-sky-light shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-sky-light">{c.contractNo}</div>
                  {c.title && <div className="text-sm text-white">{c.title}</div>}
                  <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {c.partyName && <span>{c.partyName}</span>}
                    <span>{formatMoney(c.value)}</span>
                    {c.signedAt && (
                      <span>Ký: {new Date(c.signedAt).toLocaleDateString("vi-VN")}</span>
                    )}
                    <span>{STATUS_LABELS[c.status]}</span>
                  </div>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void removeContract(c.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {canEdit && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Trạng thái</label>
                    <AppSelect
                      value={c.status}
                      onChange={(v) => void updateField(c.id, { status: v })}
                      className="input-field text-[11px] w-full text-left flex items-center justify-between !h-[28px]"
                      options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Giá trị</label>
                    <input
                      defaultValue={c.value ? String(c.value) : ""}
                      onBlur={(e) => {
                        const n = Number(e.target.value.replace(/\D/g, "")) || 0;
                        if (n !== c.value) void updateField(c.id, { value: n });
                      }}
                      className="input-field text-[11px] !h-[28px]"
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase text-slate-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="input-field text-xs !h-[30px]"
      />
    </div>
  );
}

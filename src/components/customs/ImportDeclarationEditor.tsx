"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import {
  CHANNEL_LABELS,
  DECLARATION_STATUS_LABELS,
  DECLARATION_STATUS_TONES,
  INCOTERMS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PROCEDURE_TYPE_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
} from "@/lib/customs/constants";
import type { ImportDeclaration, ImportDeclarationLine } from "@/lib/customs/types";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import { AppSelect } from "@/components/ui/AppSelect";
import { MasterDataHints } from "./MasterDataHints";
import { useCustomsMasterHints } from "./useCustomsMasterHints";

const emptyLine = (): ImportDeclarationLine => ({
  id: 0,
  declarationId: 0,
  lineNo: 1,
  hsCode: "",
  description: "",
  quantity: 1,
  unitCode: "PCE",
  unitPrice: 0,
  currency: "USD",
  originCountry: "CN",
  notes: "",
  importDutyCode: "",
  vatDutyCode: "",
});

export function ImportDeclarationEditor({ id }: { id: number }) {
  const [decl, setDecl] = useState<ImportDeclaration | null>(null);
  const [lines, setLines] = useState<ImportDeclarationLine[]>([emptyLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customs/import-declarations/${id}`);
    const j = await res.json();
    if (res.ok) {
      setDecl(j);
      setLines(j.lines?.length ? j.lines : [emptyLine()]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = decl && ["draft", "validated", "rejected"].includes(decl.status);
  const officeHints = useCustomsMasterHints("customs_office", decl?.customsOfficeCode ?? "", Boolean(editable));
  const importPortHints = useCustomsMasterHints("import_port", decl?.borderGateCode ?? "", Boolean(editable));
  const exportPortHints = useCustomsMasterHints("export_port", decl?.loadingPortCode ?? "", Boolean(editable));
  const warehouseHints = useCustomsMasterHints("warehouse", decl?.warehouseCode ?? "", Boolean(editable));

  function patchDecl(p: Partial<ImportDeclaration>) {
    setDecl((d) => (d ? { ...d, ...p } : d));
  }

  async function save() {
    if (!decl) return;
    setSaving(true);
    const res = await fetch(`/api/customs/import-declarations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...decl,
        lines: lines.map((l, i) => ({
          lineNo: i + 1,
          hsCode: l.hsCode,
          description: l.description,
          quantity: l.quantity,
          unitCode: l.unitCode,
          unitPrice: l.unitPrice,
          currency: l.currency,
          originCountry: l.originCountry,
          notes: l.notes,
        })),
      }),
    });
    const j = await res.json();
    setSaving(false);
    if (res.ok) {
      setDecl(j);
      setLines(j.lines?.length ? j.lines : [emptyLine()]);
    } else alert(j.error || "Lưu thất bại");
  }

  async function validate() {
    await save();
    setBusy("validate");
    const res = await fetch(`/api/customs/import-declarations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate" }),
    });
    setBusy("");
    const j = await res.json();
    if (res.ok) setDecl(j);
    else alert(j.error || "Kiểm tra thất bại");
  }

  async function transmit(procedure: "IDA" | "IDC") {
    if (!confirm(`Gửi nghiệp vụ ${procedure} lên hệ thống hải quan?`)) return;
    await save();
    setBusy(procedure);
    const res = await fetch(`/api/customs/import-declarations/${id}/transmit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ procedure }),
    });
    setBusy("");
    const j = await res.json();
    if (res.ok) {
      setDecl(j);
      setLines(j.lines ?? lines);
      alert(j.customsMessage || "Đã gửi");
    } else alert(j.error || "Gửi thất bại");
  }

  if (loading) return <p className="text-slate-400">Đang tải…</p>;
  if (!decl) return <p className="text-rose-300">Không tải được tờ khai.</p>;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/erp/xnk/hai-quan-nhap" className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sky-light text-sm">{decl.referenceCode}</div>
          <div className="text-white font-medium text-sm truncate">{decl.importerName || "Tờ khai nhập"}</div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded ${DECLARATION_STATUS_TONES[decl.status]}`}>
          {DECLARATION_STATUS_LABELS[decl.status]}
        </span>
        <span className="text-[10px] text-slate-400">{CHANNEL_LABELS[decl.channel]}</span>
      </div>

      {(decl.declarationNo || decl.idaRegistrationNo) && (
        <div className="text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
          {decl.idaRegistrationNo && <div>IDA: {decl.idaRegistrationNo}</div>}
          {decl.declarationNo && <div>Số tờ khai: {decl.declarationNo}</div>}
          {decl.customsMessage && <div className="text-slate-500 mt-1">{decl.customsMessage}</div>}
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-xs font-medium text-slate-400 uppercase">Thông tin chung</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Inp label="MST NK" value={decl.importerTaxCode} disabled={!editable} onChange={(v) => patchDecl({ importerTaxCode: v })} />
          <Inp label="Tên NK" value={decl.importerName} disabled={!editable} onChange={(v) => patchDecl({ importerName: v })} />
          <Sel label="Loại hình" value={decl.procedureTypeCode} disabled={!editable} options={PROCEDURE_TYPE_OPTIONS} onChange={(v) => patchDecl({ procedureTypeCode: v })} />
          <div className="col-span-2 space-y-1">
            <Inp label="Cơ quan HQ xử lý" value={decl.customsOfficeCode} disabled={!editable} onChange={(v) => patchDecl({ customsOfficeCode: v })} placeholder="01E1" />
            <MasterDataHints hints={officeHints} onPick={(code) => patchDecl({ customsOfficeCode: code })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Inp label="Cảng nhập (VN)" value={decl.borderGateCode} disabled={!editable} onChange={(v) => patchDecl({ borderGateCode: v })} />
            <MasterDataHints hints={importPortHints} onPick={(code) => patchDecl({ borderGateCode: code })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Inp label="Cảng xuất" value={decl.loadingPortCode ?? ""} disabled={!editable} onChange={(v) => patchDecl({ loadingPortCode: v })} placeholder="CNSHA" />
            <MasterDataHints hints={exportPortHints} onPick={(code) => patchDecl({ loadingPortCode: code })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Inp label="Kho lưu hàng" value={decl.warehouseCode} disabled={!editable} onChange={(v) => patchDecl({ warehouseCode: v })} />
            <MasterDataHints hints={warehouseHints} onPick={(code) => patchDecl({ warehouseCode: code })} />
          </div>
          <Sel label="PT vận chuyển" value={decl.transportModeCode} disabled={!editable} options={TRANSPORT_MODE_OPTIONS} onChange={(v) => patchDecl({ transportModeCode: v })} />
          <Inp label="Số vận đơn" value={decl.billOfLadingNo} disabled={!editable} onChange={(v) => patchDecl({ billOfLadingNo: v })} />
          <Inp label="Số HĐ" value={decl.invoiceNo} disabled={!editable} onChange={(v) => patchDecl({ invoiceNo: v })} />
          <label className="block">
            <span className="text-[10px] text-slate-500">Ngày HĐ</span>
            <ErpDateInput
              value={decl.invoiceDate ?? ""}
              disabled={!editable}
              className="text-xs py-1 mt-0.5"
              onChange={(v) => patchDecl({ invoiceDate: v || null })}
            />
          </label>
          <Inp label="Số HĐ mua bán" value={decl.contractNo} disabled={!editable} onChange={(v) => patchDecl({ contractNo: v })} />
          <Sel label="Incoterms" value={decl.incoterms} disabled={!editable} options={INCOTERMS_OPTIONS.map((x) => ({ value: x, label: x }))} onChange={(v) => patchDecl({ incoterms: v })} />
          <Inp label="Tiền tệ" value={decl.currency} disabled={!editable} onChange={(v) => patchDecl({ currency: v })} />
          <Inp label="Tỷ giá" type="number" value={String(decl.exchangeRate)} disabled={!editable} onChange={(v) => patchDecl({ exchangeRate: Number(v) || 1 })} />
          <Inp label="Xuất xứ" value={decl.countryOfExport} disabled={!editable} onChange={(v) => patchDecl({ countryOfExport: v })} />
          <Inp label="Nước XX" value={decl.countryOfOrigin} disabled={!editable} onChange={(v) => patchDecl({ countryOfOrigin: v })} />
          <Sel label="Thanh toán" value={decl.paymentMethodCode} disabled={!editable} options={PAYMENT_METHOD_OPTIONS} onChange={(v) => patchDecl({ paymentMethodCode: v })} />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-400 uppercase">Hàng hóa</h3>
          {editable && (
            <button
              type="button"
              className="text-xs text-sky-light"
              onClick={() => setLines((ls) => [...ls, { ...emptyLine(), lineNo: ls.length + 1 }])}
            >
              + Dòng
            </button>
          )}
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 items-end bg-white/[0.03] rounded-lg p-2 border border-white/8">
              <div className="col-span-2">
                <Inp label="HS" value={l.hsCode} disabled={!editable} onChange={(v) => setLine(i, { hsCode: v })} />
              </div>
              <div className="col-span-4">
                <Inp label="Mô tả" value={l.description} disabled={!editable} onChange={(v) => setLine(i, { description: v })} />
              </div>
              <div className="col-span-1">
                <Inp label="SL" type="number" value={String(l.quantity)} disabled={!editable} onChange={(v) => setLine(i, { quantity: Number(v) || 0 })} />
              </div>
              <div className="col-span-2">
                <Inp label="Đơn giá" type="number" value={String(l.unitPrice)} disabled={!editable} onChange={(v) => setLine(i, { unitPrice: Number(v) || 0 })} />
              </div>
              <div className="col-span-2">
                <Inp label="XX" value={l.originCountry} disabled={!editable} onChange={(v) => setLine(i, { originCountry: v })} />
              </div>
              {editable && lines.length > 1 && (
                <button type="button" className="col-span-1 text-rose-400 p-1" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
        {editable && (
          <>
            <button type="button" onClick={() => void save()} disabled={saving} className="border border-white/20 px-3 py-1.5 rounded-lg text-sm text-slate-200 hover:bg-white/10">
              {saving ? "Đang lưu…" : "Lưu nháp"}
            </button>
            <button type="button" onClick={() => void validate()} disabled={!!busy} className="border border-sky/40 px-3 py-1.5 rounded-lg text-sm text-sky-light">
              Kiểm tra dữ liệu
            </button>
            <button type="button" onClick={() => void transmit("IDA")} disabled={!!busy} className="inline-flex items-center gap-1 bg-sky text-white px-3 py-1.5 rounded-lg text-sm">
              <Send size={14} /> Gửi IDA
            </button>
            <button
              type="button"
              onClick={() => void transmit("IDC")}
              disabled={!!busy || !decl.idaRegistrationNo}
              title={!decl.idaRegistrationNo ? "Cần gửi IDA trước" : ""}
              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
            >
              <Send size={14} /> Gửi IDC
            </button>
          </>
        )}
      </div>
    </div>
  );

  function setLine(i: number, p: Partial<ImportDeclarationLine>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  }
}

function Inp({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`input-field w-full text-xs py-1 mt-0.5 ${type === "date" ? "erp-date-input" : ""}`}
      />
    </label>
  );
}

function Sel({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-500">{label}</span>
      <AppSelect
        value={value}
        disabled={disabled}
        onChange={onChange}
        className="input-field w-full text-xs py-1 mt-0.5 text-left flex items-center justify-between"
        options={options}
      />
    </label>
  );
}

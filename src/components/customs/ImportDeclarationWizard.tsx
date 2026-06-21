"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Download,
  FileText,
  Package,
  Send,
  Ship,
  Truck,
} from "lucide-react";
import {
  CHANNEL_LABELS,
  DECLARATION_STATUS_LABELS,
  DECLARATION_STATUS_TONES,
  INCOTERMS_OPTIONS,
  PARTY_CLASSIFICATION_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PROCEDURE_TYPE_OPTIONS,
  TRANSPORT_MODE_OPTIONS,
} from "@/lib/customs/constants";
import type { DeclarationMeta } from "@/lib/customs/declaration-meta";
import { emptyDeclarationMeta } from "@/lib/customs/declaration-meta";
import { buildDeclarationSavePayload } from "@/lib/customs/declaration-save";
import { getIdaPresetHqs4324 } from "@/lib/customs/ida-presets";
import type {
  ImportDeclaration,
  ImportDeclarationLine,
  ImportDeclarationPreflightReport,
} from "@/lib/customs/types";
import { AppSelect } from "@/components/ui/AppSelect";
import { CustomsSetupGate } from "./CustomsSetupGate";
import { MasterCodePicker, verifyMasterCode } from "./MasterCodePicker";

const LOCKED_STATUSES = new Set(["submitted", "accepted", "transmitting", "cancelled"]);

const STEPS = [
  { id: "general", label: "Thông tin chung", icon: FileText },
  { id: "parties", label: "Đơn vị XNK", icon: Building2 },
  { id: "transport", label: "Vận đơn", icon: Truck },
  { id: "invoice", label: "Hóa đơn", icon: Ship },
  { id: "goods", label: "Hàng hóa", icon: Package },
  { id: "send", label: "Gửi HQ", icon: Send },
] as const;

type StepId = (typeof STEPS)[number]["id"];
const STEP_ORDER: StepId[] = ["general", "parties", "transport", "invoice", "goods", "send"];

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

export function ImportDeclarationWizard({ id }: { id: number }) {
  return (
    <CustomsSetupGate>
      <ImportDeclarationWizardInner id={id} />
    </CustomsSetupGate>
  );
}

function ImportDeclarationWizardInner({ id }: { id: number }) {
  const [step, setStep] = useState<StepId>("general");
  const [decl, setDecl] = useState<ImportDeclaration | null>(null);
  const [meta, setMeta] = useState<DeclarationMeta>(emptyDeclarationMeta());
  const [lines, setLines] = useState<ImportDeclarationLine[]>([emptyLine()]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [sendReady, setSendReady] = useState(false);
  const [preflight, setPreflight] = useState<ImportDeclarationPreflightReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customs/import-declarations/${id}`);
    const j = await res.json();
    if (res.ok) {
      setDecl(j);
      setMeta(j.meta ?? emptyDeclarationMeta());
      setLines(j.lines?.length ? j.lines : [emptyLine()]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable =
    decl && !LOCKED_STATUSES.has(decl.status) && ["draft", "validated", "rejected"].includes(decl.status);
  const isLocked = decl ? LOCKED_STATUSES.has(decl.status) : false;

  function patch(p: Partial<ImportDeclaration>) {
    setDecl((d) => (d ? { ...d, ...p } : d));
  }

  function patchMeta(p: Partial<DeclarationMeta>) {
    setMeta((m) => ({ ...m, ...p }));
  }

  function applyHqs4324Preset() {
    const preset = getIdaPresetHqs4324({
      taxCode: decl?.importerTaxCode,
      companyName: decl?.importerName,
    });
    patch({ ...preset.input, meta: preset.meta } as Partial<ImportDeclaration>);
    setMeta(preset.meta);
    if (preset.input.lines?.length) {
      setLines(
        preset.input.lines.map((l, i) => ({
          ...emptyLine(),
          ...l,
          lineNo: i + 1,
          importDutyCode: l.notes?.match(/duty=([A-Z0-9]+)/i)?.[1] ?? "",
          vatDutyCode: l.notes?.match(/vat=([A-Z0-9]+)/i)?.[1] ?? "",
        }))
      );
    }
    setStep("general");
  }

  async function persist(): Promise<boolean> {
    if (!decl) return false;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/customs/import-declarations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildDeclarationSavePayload(decl, meta, lines)),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setDecl(j as ImportDeclaration);
        setMeta((j as ImportDeclaration).meta ?? meta);
        setLines((j as ImportDeclaration).lines?.length ? (j as ImportDeclaration).lines! : [emptyLine()]);
        setSaveMsg("Đã lưu " + new Date().toLocaleTimeString("vi-VN"));
        return true;
      }
      alert(j.error || `Lưu thất bại (mã ${res.status})`);
      return false;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi mạng — không lưu được");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function validateStepBeforeLeave(current: StepId): Promise<boolean> {
    if (!decl) return true;
    if (current === "general" && decl.customsOfficeCode.trim()) {
      const v = await verifyMasterCode("customs_office", decl.customsOfficeCode);
      if (!v.ok) {
        alert(v.message);
        return false;
      }
    }
    if (current === "transport") {
      for (const [label, type, code] of [
        ["Kho lưu hàng", "warehouse", decl.warehouseCode],
        ["Cảng nhập (dỡ)", "import_port", decl.borderGateCode],
        ["Cảng xuất (xếp)", "export_port", decl.loadingPortCode],
      ] as const) {
        if (!code.trim()) {
          alert(`Chưa nhập mã: ${label}`);
          return false;
        }
        const v = await verifyMasterCode(type, code);
        if (!v.ok) {
          alert(`${label}: ${v.message}`);
          return false;
        }
      }
    }
    return true;
  }

  async function goNext(next: StepId) {
    if (!decl) return;
    if (editable) {
      if (!(await persist())) return;
      if (!(await validateStepBeforeLeave(step))) return;
    }
    setSendReady(false);
    setPreflight(null);
    setStep(next);
  }

  async function jumpToStep(target: StepId) {
    if (!decl) return;
    const curIdx = STEP_ORDER.indexOf(step);
    const targetIdx = STEP_ORDER.indexOf(target);
    if (targetIdx > curIdx && editable) {
      if (!(await persist())) return;
      if (!(await validateStepBeforeLeave(step))) return;
    }
    setSendReady(false);
    setStep(target);
  }

  async function runPreflight(): Promise<ImportDeclarationPreflightReport | null> {
    const res = await fetch(`/api/customs/import-declarations/${id}/preflight`);
    const j = await res.json();
    if (!res.ok) {
      alert(j.error || "Không chạy được kiểm tra");
      return null;
    }
    setPreflight(j);
    return j;
  }

  async function downloadExport(kind: "hq7n" | "xml" | "excel") {
    if (!decl) return;
    if (editable && !(await persist())) return;
    const path =
      kind === "hq7n"
        ? `/api/customs/import-declarations/${id}/export-tokhai-hq7n`
        : kind === "xml"
          ? `/api/customs/import-declarations/${id}/export-xml`
          : `/api/customs/import-declarations/${id}/export-lines-excel`;
    const res = await fetch(path);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert((j as { error?: string }).error || "Không tải được file");
      return;
    }
    const blob = await res.blob();
    const disp = res.headers.get("Content-Disposition") || "";
    const m = /filename="([^"]+)"/.exec(disp);
    const filename = m?.[1] ?? (kind === "xml" ? `IDA_${decl.referenceCode}.xml` : `IDA_Hang.xlsx`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    const gaps = res.headers.get("X-Customs-Export-Gaps");
    if (gaps) {
      alert(
        "Đã tải file. Một số chỉ tiêu HQ có thể cần nhập thêm trên cổng:\n" +
          gaps.replace(/\|/g, "\n")
      );
    }
  }

  async function checkOrSend() {
    if (!editable || !decl) return;
    if (sendReady) {
      if (!confirm("Gửi tờ khai IDA lên hệ thống HQ?")) return;
      setBusy("send");
      await fetch(`/api/customs/import-declarations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate" }),
      });
      const res = await fetch(`/api/customs/import-declarations/${id}/transmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedure: "IDA" }),
      });
      setBusy("");
      const j = await res.json();
      if (res.ok) {
        setDecl(j);
        setSendReady(false);
        setPreflight(null);
      } else alert(j.error || "Gửi thất bại");
      return;
    }
    setBusy("check");
    setSendReady(false);
    if (!(await persist())) {
      setBusy("");
      return;
    }
    const report = await runPreflight();
    setBusy("");
    if (report?.summary.readyToSend) {
      setSendReady(true);
    } else {
      alert("Tờ khai chưa đạt — xem lỗi bên dưới và sửa các bước trước.");
    }
  }

  if (loading) return <p className="text-slate-400 text-sm py-8 text-center">Đang tải…</p>;
  if (!decl) return <p className="text-rose-300 text-sm">Không tải được tờ khai.</p>;

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <header className="flex items-center gap-2 mb-4">
        <Link href="/erp/xnk/hai-quan-nhap" className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-500 font-mono">{decl.referenceCode}</p>
          <h1 className="text-lg font-semibold text-white truncate">Tờ khai nhập IDA</h1>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${DECLARATION_STATUS_TONES[decl.status]}`}
        >
          {DECLARATION_STATUS_LABELS[decl.status]}
        </span>
      </header>

      {isLocked && (
        <p className="mb-4 text-sm text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          Tờ khai đã gửi HQ ({DECLARATION_STATUS_LABELS[decl.status]}) — chỉ xem, không chỉnh sửa.
        </p>
      )}

      {saveMsg && editable && (
        <p className="text-xs text-emerald-400 mb-2">{saveMsg}</p>
      )}

      {editable && (
        <button
          type="button"
          onClick={() => applyHqs4324Preset()}
          className="w-full mb-4 text-left rounded-xl border border-sky/40 bg-sky/10 px-4 py-3 text-sm text-sky-light hover:bg-sky/20"
        >
          <strong className="text-white">Điền mẫu lô HQS4324 260508</strong>
          <span className="block text-xs text-slate-400 mt-1">
            06DS · 06DSEDA · SGN · CNPVG · FedEx · lọc khí HS 8421399000
          </span>
        </button>
      )}

      <nav className="flex gap-0.5 mb-6 p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => void jumpToStep(s.id)}
              className={`shrink-0 flex-1 min-w-[4.5rem] flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-medium ${
                active ? "bg-sky/25 text-sky-light" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </nav>

      {step === "general" && (
        <section className="space-y-3 text-sm">
          <p className="text-slate-400 text-xs">
            Khớp tab «Thông tin chung» trên VNACCS. Mã phải chọn từ danh sách HQ (gõ ≥3 ký tự).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã loại hình" required>
              <AppSelect
                value={decl.procedureTypeCode}
                disabled={!editable}
                onChange={(v) => patch({ procedureTypeCode: v })}
                options={PROCEDURE_TYPE_OPTIONS}
              />
            </Field>
            <Field label="Phân loại cá nhân/tổ chức" required>
              <AppSelect
                value={meta.partyClassification ?? ""}
                disabled={!editable}
                onChange={(v) => patchMeta({ partyClassification: v })}
                options={PARTY_CLASSIFICATION_OPTIONS}
              />
            </Field>
            <MasterCodePicker
              label="HQ tiếp nhận (cơ quan xử lý)"
              type="customs_office"
              value={decl.customsOfficeCode}
              disabled={!editable}
              required
              placeholder="06DS"
              onChange={(code) => patch({ customsOfficeCode: code })}
            />
            <Field label="Mã PT vận chuyển" required>
              <AppSelect
                value={decl.transportModeCode}
                disabled={!editable}
                onChange={(v) => patch({ transportModeCode: v })}
                options={TRANSPORT_MODE_OPTIONS}
              />
            </Field>
            <Field label="Ngày hàng đến (dự kiến)">
              <input
                type="date"
                className="input-field text-sm w-full"
                value={decl.expectedArrivalDate ?? ""}
                disabled={!editable}
                onChange={(e) => patch({ expectedArrivalDate: e.target.value || null })}
              />
            </Field>
            <Field label="Số tham chiếu nội bộ">
              <input
                className="input-field text-sm w-full"
                value={decl.referenceCode}
                disabled={!editable}
                onChange={(e) => patch({ referenceCode: e.target.value })}
              />
            </Field>
          </div>
          <FooterNav
            saving={saving}
            onSave={editable ? () => persist() : undefined}
            onNext={() => goNext("parties")}
          />
        </section>
      )}

      {step === "parties" && (
        <section className="space-y-3 text-sm">
          <h3 className="text-xs font-medium text-slate-400 uppercase">Người nhập khẩu</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="MST" required>
              <input
                className="input-field text-sm"
                value={decl.importerTaxCode}
                disabled={!editable}
                onChange={(e) => patch({ importerTaxCode: e.target.value })}
              />
            </Field>
            <Field label="Tên (IN HOA)" required>
              <input
                className="input-field text-sm uppercase"
                value={decl.importerName}
                disabled={!editable}
                onChange={(e) => patch({ importerName: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Địa chỉ" className="sm:col-span-2">
              <input
                className="input-field text-sm"
                value={meta.importerAddress ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ importerAddress: e.target.value })}
              />
            </Field>
            <Field label="Điện thoại">
              <input
                className="input-field text-sm"
                value={meta.importerPhone ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ importerPhone: e.target.value })}
              />
            </Field>
          </div>
          <h3 className="text-xs font-medium text-slate-400 uppercase pt-2">Người xuất khẩu</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên (IN HOA)" className="sm:col-span-2">
              <input
                className="input-field text-sm uppercase"
                value={meta.exporterName ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ exporterName: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Mã nước">
              <input
                className="input-field text-sm"
                value={meta.exporterCountry ?? decl.countryOfExport}
                disabled={!editable}
                onChange={(e) => {
                  patchMeta({ exporterCountry: e.target.value });
                  patch({ countryOfExport: e.target.value });
                }}
                placeholder="CN"
              />
            </Field>
            <Field label="Điện thoại">
              <input
                className="input-field text-sm"
                value={meta.exporterPhone ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ exporterPhone: e.target.value })}
              />
            </Field>
          </div>
          <FooterNav
            saving={saving}
            onSave={editable ? () => persist() : undefined}
            onBack={() => setStep("general")}
            onNext={() => goNext("transport")}
          />
        </section>
      )}

      {step === "transport" && (
        <section className="space-y-3 text-sm">
          <p className="text-slate-400 text-xs">Tab «Vận đơn» — địa điểm lưu kho là bắt buộc trên HQ.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Số vận đơn" required>
              <input
                className="input-field text-sm"
                value={decl.billOfLadingNo}
                disabled={!editable}
                onChange={(e) => patch({ billOfLadingNo: e.target.value })}
              />
            </Field>
            <Field label="Tên PT vận chuyển">
              <input
                className="input-field text-sm"
                value={meta.transportMeansName ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ transportMeansName: e.target.value })}
                placeholder="HANG KHONG"
              />
            </Field>
            <Field label="Số kiện">
              <input
                type="number"
                className="input-field text-sm"
                value={meta.packageCount ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ packageCount: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Trọng lượng (kg)">
              <input
                type="number"
                step="0.1"
                className="input-field text-sm"
                value={meta.grossWeightKg ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ grossWeightKg: Number(e.target.value) || 0 })}
              />
            </Field>
            <MasterCodePicker
              label="Địa điểm lưu kho chờ thông quan"
              type="warehouse"
              value={decl.warehouseCode}
              disabled={!editable}
              required
              placeholder="06DSEDA"
              onChange={(code) => patch({ warehouseCode: code })}
            />
            <MasterCodePicker
              label="Địa điểm dỡ hàng (cảng nhập VN)"
              type="import_port"
              value={decl.borderGateCode}
              disabled={!editable}
              required
              placeholder="SGN"
              onChange={(code) => patch({ borderGateCode: code })}
            />
            <MasterCodePicker
              label="Địa điểm xếp hàng (cảng xuất)"
              type="export_port"
              value={decl.loadingPortCode}
              disabled={!editable}
              required
              placeholder="CNPVG"
              onChange={(code) => patch({ loadingPortCode: code })}
            />
          </div>
          <FooterNav
            saving={saving}
            onSave={editable ? () => persist() : undefined}
            onBack={() => setStep("parties")}
            onNext={() => goNext("invoice")}
          />
        </section>
      )}

      {step === "invoice" && (
        <section className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Số hóa đơn" required>
              <input
                className="input-field text-sm"
                value={decl.invoiceNo}
                disabled={!editable}
                onChange={(e) => patch({ invoiceNo: e.target.value })}
              />
            </Field>
            <Field label="Phương thức thanh toán">
              <AppSelect
                value={decl.paymentMethodCode}
                disabled={!editable}
                onChange={(v) => patch({ paymentMethodCode: v })}
                options={PAYMENT_METHOD_OPTIONS}
              />
            </Field>
            <Field label="Ghi chú PTTT">
              <input
                className="input-field text-sm"
                value={meta.paymentRemark ?? ""}
                disabled={!editable}
                onChange={(e) => patchMeta({ paymentRemark: e.target.value })}
                placeholder="PTTT: TT"
              />
            </Field>
            <Field label="Điều kiện giá (Incoterms)">
              <AppSelect
                value={decl.incoterms}
                disabled={!editable}
                onChange={(v) => patch({ incoterms: v })}
                options={INCOTERMS_OPTIONS.map((x) => ({ value: x, label: x }))}
              />
            </Field>
            <Field label="Tiền tệ">
              <input
                className="input-field text-sm"
                value={decl.currency}
                disabled={!editable}
                onChange={(e) => patch({ currency: e.target.value })}
              />
            </Field>
            <Field label="Xuất xứ hàng">
              <input
                className="input-field text-sm"
                value={decl.countryOfOrigin}
                disabled={!editable}
                onChange={(e) => patch({ countryOfOrigin: e.target.value })}
              />
            </Field>
          </div>
          <FooterNav
            saving={saving}
            onSave={editable ? () => persist() : undefined}
            onBack={() => setStep("transport")}
            onNext={() => goNext("goods")}
          />
        </section>
      )}

      {step === "goods" && (
        <section className="space-y-3 text-sm">
          {lines.map((l, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Mini label="Mã HS" value={l.hsCode} disabled={!editable} onChange={(v) => setLine(i, { hsCode: v })} />
                <Mini label="SL" value={String(l.quantity)} disabled={!editable} onChange={(v) => setLine(i, { quantity: Number(v) || 0 })} />
                <Mini label="ĐVT" value={l.unitCode} disabled={!editable} onChange={(v) => setLine(i, { unitCode: v })} />
                <Mini label="Đơn giá USD" value={String(l.unitPrice)} disabled={!editable} onChange={(v) => setLine(i, { unitPrice: Number(v) || 0 })} />
              </div>
              <label className="block">
                <span className="text-[10px] text-slate-500">Mô tả hàng</span>
                <textarea
                  className="input-field text-xs w-full mt-0.5 min-h-16"
                  value={l.description}
                  disabled={!editable}
                  onChange={(e) => setLine(i, { description: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Mini label="Thuế NK" value={l.importDutyCode} disabled={!editable} onChange={(v) => setLine(i, { importDutyCode: v })} />
                <Mini label="Thuế VAT" value={l.vatDutyCode} disabled={!editable} onChange={(v) => setLine(i, { vatDutyCode: v })} />
              </div>
            </div>
          ))}
          {editable && (
            <button
              type="button"
              className="text-xs text-slate-400"
              onClick={() => setLines((ls) => [...ls, { ...emptyLine(), lineNo: ls.length + 1 }])}
            >
              + Thêm dòng hàng
            </button>
          )}
          <FooterNav
            saving={saving}
            onSave={editable ? () => persist() : undefined}
            onBack={() => setStep("invoice")}
            onNext={() => goNext("send")}
          />
        </section>
      )}

      {step === "send" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 p-4 space-y-2 text-sm text-slate-300">
            <p>• HQ: <span className="font-mono text-sky-light">{decl.customsOfficeCode || "—"}</span></p>
            <p>• Kho: <span className="font-mono">{decl.warehouseCode || "—"}</span> · Dỡ: {decl.borderGateCode} · Xếp: {decl.loadingPortCode}</p>
            <p>• VĐ: {decl.billOfLadingNo} · HĐ: {decl.invoiceNo}</p>
            <p>• {lines.length} dòng hàng · {CHANNEL_LABELS[decl.channel]}</p>
          </div>
          {editable && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => void downloadExport("hq7n")}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/30 text-amber-100/90 text-sm hover:bg-amber-500/10"
                title="Chờ file mẫu import thật từ HQ/ECUS"
              >
                <Download size={16} />
                Tải Excel ToKhaiHQ7N (thử — chưa có mẫu import)
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void downloadExport("xml")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 text-slate-300 text-sm hover:bg-white/5"
                >
                  <Download size={16} />
                  Tải XML (tham khảo)
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void downloadExport("excel")}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 text-slate-300 text-sm hover:bg-white/5"
                >
                  <Download size={16} />
                  Excel chỉ dòng hàng (F6)
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nộp thật: nhập / import trên{" "}
                <a
                  href="https://e-declaration.customs.gov.vn:8443/#/eclare-ui/QLTKN/QLTKN_IDA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-light underline"
                >
                  cổng Khai báo Hải quan
                </a>
                . File ToKhaiHQ7N trong project hiện là <strong className="text-amber-200/80">bản HQ trả về sau IDA</strong>, không phải mẫu import — khi có file import thật sẽ cập nhật mapping.
              </p>
              <button
                type="button"
                disabled={!!busy || saving}
                onClick={() => void checkOrSend()}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                  sendReady
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "border border-white/20 text-slate-200 hover:bg-white/5"
                }`}
              >
                <Send size={18} />
                {busy === "send"
                  ? "Đang gửi…"
                  : busy === "check"
                    ? "Đang kiểm tra…"
                    : sendReady
                      ? "Gửi khai báo IDA (gateway)"
                      : "Kiểm tra (gateway mô phỏng)"}
              </button>
              {preflight && (
                <div className="rounded-xl border border-white/10 p-3 text-xs space-y-1 max-h-48 overflow-auto">
                  {preflight.checks.map((c, idx) => (
                    <p key={idx} className={c.severity === "error" ? "text-rose-300" : "text-slate-400"}>
                      {c.message}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
          <FooterNav saving={saving} onBack={() => setStep("goods")} hideNext />
          <p className="text-[11px] text-slate-500 text-center">
            Ưu tiên: tải XML/Excel → nộp trên cổng HQ. Nút &quot;Gửi khai báo&quot; bên dưới chỉ dùng khi đã cấu hình gateway VNACCS.
          </p>
        </section>
      )}
    </div>
  );

  function setLine(i: number, p: Partial<ImportDeclarationLine>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  }
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs text-slate-400 mb-1 block">
        {label}
        {required && <span className="text-rose-400"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Mini({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[9px] text-slate-500">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-full text-xs py-0.5 mt-0.5"
      />
    </label>
  );
}

function FooterNav({
  onBack,
  onNext,
  onSave,
  hideNext,
  saving,
}: {
  onBack?: () => void;
  onNext?: () => void | Promise<void>;
  onSave?: () => void | Promise<boolean>;
  hideNext?: boolean;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10 mt-4">
      {onBack ? (
        <button
          type="button"
          disabled={saving}
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-white disabled:opacity-50"
        >
          Quay lại
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2 ml-auto">
        {onSave && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="text-sm border border-white/20 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu tờ khai"}
          </button>
        )}
        {!hideNext && onNext && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void onNext()}
            className="inline-flex items-center gap-1 text-sm bg-sky/20 text-sky-light font-medium px-3 py-1.5 rounded-lg hover:bg-sky/30 disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Tiếp"}
            {!saving && <ChevronRight size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

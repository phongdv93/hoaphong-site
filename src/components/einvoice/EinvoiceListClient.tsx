"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, FileText, RefreshCw, Settings, X } from "lucide-react";
import { ErpDateInput } from "@/components/erp/ErpDateInput";
import { AppSelect } from "@/components/ui/AppSelect";
import type { EInvoiceRecord } from "@/lib/einvoice/types";
import { INVOICE_DIRECTION_LABELS } from "@/lib/einvoice/constants";
import { formatVnMoney } from "@/lib/quote/calc";

const DIRECTION_OPTIONS = [
  { value: "out", label: INVOICE_DIRECTION_LABELS.out },
  { value: "in", label: INVOICE_DIRECTION_LABELS.in },
] as const;

type InvoiceLine = {
  stt?: string;
  ma?: string;
  ten?: string;
  dvtinh?: string;
  sluong?: number;
  dgia?: number;
  thtien?: number;
  tsuat?: string;
  tthue?: number;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs min-w-[9.5rem]">
      <span className="text-slate-400 mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function parseInvoiceLines(raw?: Record<string, unknown>): InvoiceLine[] {
  if (!raw) return [];
  const details = raw.details;
  if (Array.isArray(details)) return details as InvoiceLine[];
  if (typeof details === "string" && details.trim()) {
    try {
      const parsed = JSON.parse(details) as unknown;
      return Array.isArray(parsed) ? (parsed as InvoiceLine[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function InvoiceDetailPanel({
  invoiceId,
  onClose,
}: {
  invoiceId: number;
  onClose: () => void;
}) {
  const [invoice, setInvoice] = useState<EInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/einvoice/invoices/${invoiceId}${refresh ? "?refresh=1" : ""}`);
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(j.error || "Không tải được chi tiết");
      setInvoice(null);
      return;
    }
    setInvoice(j.invoice as EInvoiceRecord);
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const lines = useMemo(() => parseInvoiceLines(invoice?.rawJson), [invoice?.rawJson]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full bg-[#0c1524] border-l border-white/10 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-[#0c1524]">
          <h2 className="font-semibold text-slate-100 text-sm">Chi tiết hóa đơn</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Đang tải…</p>
          ) : error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : invoice ? (
            <>
              <div className="space-y-1 text-sm">
                <p className="text-lg font-medium text-white">
                  {invoice.invoiceSeries} / {invoice.invoiceNo}
                </p>
                <p className="text-slate-400">Ngày: {formatDate(invoice.invoiceDate)}</p>
                <p className="text-slate-300">{invoice.counterpartyName || "—"}</p>
                <p className="text-slate-500">MST: {invoice.counterpartyTaxCode || "—"}</p>
                <p className="text-slate-400 text-xs">Trạng thái: {invoice.statusText || "—"}</p>
                {invoice.taxAuthorityCode ? (
                  <p className="text-slate-500 text-xs">Mã CQT: {invoice.taxAuthorityCode}</p>
                ) : null}
                {invoice.lookupCode ? (
                  <p className="text-slate-500 text-xs">Mã tra cứu: {invoice.lookupCode}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="erp-card p-2">
                  <p className="text-slate-500">Trước thuế</p>
                  <p className="text-slate-200 font-medium">{formatVnMoney(invoice.totalBeforeTax)}</p>
                </div>
                <div className="erp-card p-2">
                  <p className="text-slate-500">Thuế</p>
                  <p className="text-slate-200 font-medium">{formatVnMoney(invoice.totalTax)}</p>
                </div>
                <div className="erp-card p-2">
                  <p className="text-slate-500">Tổng</p>
                  <p className="text-slate-100 font-semibold">{formatVnMoney(invoice.totalAmount)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/einvoice/invoices/${invoice.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quote-tool-btn text-sm !py-2"
                >
                  <FileText size={14} /> Tải PDF
                </a>
                <button
                  type="button"
                  onClick={() => void load(true)}
                  className="quote-tool-btn text-sm !py-2"
                >
                  <RefreshCw size={14} /> Làm mới từ MobiFone
                </button>
              </div>

              {lines.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-400 mb-2">Dòng hàng</h3>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {lines.map((ln, i) => (
                      <div
                        key={`${ln.stt ?? i}-${ln.ma ?? ""}`}
                        className="rounded border border-white/8 bg-white/[0.02] px-2 py-1.5 text-xs"
                      >
                        <div className="text-slate-200">{ln.ten || "—"}</div>
                        <div className="text-slate-500">
                          SL {ln.sluong ?? "—"} × {formatVnMoney(Number(ln.dgia ?? 0))}
                          {ln.tsuat ? ` · ${ln.tsuat}%` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EinvoiceListClient() {
  const range = useMemo(() => defaultRange(), []);
  const [items, setItems] = useState<EInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [resolvedBaseUrl, setResolvedBaseUrl] = useState("");
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, listRes] = await Promise.all([
        fetch("/api/einvoice/profile"),
        fetch(`/api/einvoice/invoices?direction=${direction}`),
      ]);
      const profileJ = await profileRes.json().catch(() => ({}));
      const listJ = await listRes.json().catch(() => ({}));
      if (!profileRes.ok) throw new Error(profileJ.error || "Không tải được cấu hình");
      if (!listRes.ok) throw new Error(listJ.error || "Không tải danh sách");
      setConfigured(Boolean(profileJ.configured));
      setResolvedBaseUrl(String(profileJ.profile?.resolvedBaseUrl ?? ""));
      setItems((listJ.items ?? []) as EInvoiceRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    if (direction === "in") {
      setError(
        "Hóa đơn mua vào chưa có API đồng bộ trong tài liệu MobiFone v4.7 — liên hệ MobiFone để bật module HĐ đầu vào hoặc tra cứu trên cổng TCT."
      );
      return;
    }
    setSyncing(true);
    setSyncMessage("");
    setError("");
    const res = await fetch("/api/einvoice/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate, toDate, direction }),
    });
    const j = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setError(j.error || "Đồng bộ thất bại");
      return;
    }
    setSyncMessage(j.message || `Đồng bộ ${j.synced} hóa đơn.`);
    void load();
  }

  return (
    <div className="flex flex-col h-full min-h-0 px-4 pb-4">
      <div className="shrink-0 flex flex-wrap items-end justify-between gap-3 py-4">
        <div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Đồng bộ <strong className="text-slate-200">hóa đơn bán ra</strong> từ MobiFone Invoice API
            (đăng nhập + lấy danh sách theo ngày). MST lấy từ hồ sơ công ty.
          </p>
          {resolvedBaseUrl && (
            <p className="text-xs text-slate-500 mt-1 font-mono break-all">API: {resolvedBaseUrl}</p>
          )}
          {!configured && (
            <p className="text-sm text-amber-200 mt-2">
              Chưa cấu hình MobiFone —{" "}
              <Link href="/erp/ke-toan/hoa-don-dien-tu/cau-hinh" className="underline text-sky">
                vào Cấu hình
              </Link>
              .
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/erp/ke-toan/hoa-don-dien-tu/cau-hinh"
            className="quote-tool-btn text-sm !py-2"
          >
            <Settings size={16} /> Cấu hình
          </Link>
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing || !configured || direction === "in"}
            className="quote-tool-btn quote-tool-btn-primary text-sm !py-2"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Đang đồng bộ…" : "Đồng bộ MobiFone"}
          </button>
        </div>
      </div>

      <div className="erp-card shrink-0 p-3 mb-3">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-3">
          <CalendarRange size={15} className="text-sky-light shrink-0" />
          Khoảng thời gian đồng bộ
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Từ ngày">
            <ErpDateInput value={fromDate} onChange={setFromDate} className="text-sm" />
          </FilterField>
          <FilterField label="Đến ngày">
            <ErpDateInput value={toDate} onChange={setToDate} className="text-sm" />
          </FilterField>
          <FilterField label="Loại hóa đơn">
            <AppSelect
              value={direction}
              options={[...DIRECTION_OPTIONS]}
              onChange={(v) => setDirection(v as "out" | "in")}
              variant="dark"
            />
          </FilterField>
        </div>
        {direction === "in" && (
          <p className="text-xs text-amber-200/90 mt-2">
            Hóa đơn mua vào: xem danh sách đã lưu; đồng bộ tự động cần module riêng từ MobiFone/TCT.
          </p>
        )}
      </div>

      {syncMessage && <p className="text-sm text-emerald-300 mb-3">{syncMessage}</p>}
      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="erp-table-wrap flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="py-2 pr-3">Ký hiệu / Số</th>
              <th className="py-2 pr-3">Ngày</th>
              <th className="py-2 pr-3">Đối tác</th>
              <th className="py-2 pr-3">MST đối tác</th>
              <th className="py-2 pr-3 text-right">Tổng</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Đang tải…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Chưa có hóa đơn — cấu hình tài khoản MobiFone rồi bấm Đồng bộ.
                </td>
              </tr>
            ) : (
              items.map((inv) => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 pr-3 text-slate-200">
                    {inv.invoiceSeries} / {inv.invoiceNo}
                  </td>
                  <td className="py-2 pr-3 text-slate-300">{formatDate(inv.invoiceDate)}</td>
                  <td className="py-2 pr-3 text-slate-300 max-w-[200px] truncate">
                    {inv.counterpartyName || "—"}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{inv.counterpartyTaxCode || "—"}</td>
                  <td className="py-2 pr-3 text-right font-medium text-slate-100">
                    {formatVnMoney(inv.totalAmount)}
                  </td>
                  <td className="py-2 pr-3 text-slate-400 text-xs">{inv.statusText || "—"}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailId(inv.id)}
                      className="text-sky text-xs hover:underline"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailId != null && (
        <InvoiceDetailPanel invoiceId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

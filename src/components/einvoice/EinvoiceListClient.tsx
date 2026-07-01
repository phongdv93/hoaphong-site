"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Settings } from "lucide-react";
import type { EInvoiceRecord } from "@/lib/einvoice/types";
import { INVOICE_DIRECTION_LABELS } from "@/lib/einvoice/constants";
import { formatVnMoney } from "@/lib/quote/calc";

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

export function EinvoiceListClient() {
  const range = useMemo(() => defaultRange(), []);
  const [items, setItems] = useState<EInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [direction, setDirection] = useState<"out" | "in" | "">("out");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, listRes] = await Promise.all([
        fetch("/api/einvoice/profile"),
        fetch(`/api/einvoice/invoices?direction=${direction || "out"}`),
      ]);
      const profileJ = await profileRes.json().catch(() => ({}));
      const listJ = await listRes.json().catch(() => ({}));
      if (!profileRes.ok) throw new Error(profileJ.error || "Không tải cấu hình");
      if (!listRes.ok) throw new Error(listJ.error || "Không tải danh sách");
      setConfigured(Boolean(profileJ.configured));
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
    setSyncing(true);
    setSyncMessage("");
    setError("");
    const res = await fetch("/api/einvoice/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate, toDate }),
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
            Đồng bộ <strong className="text-slate-200">hóa đơn bán ra</strong> từ MobiFone Invoice.
            MST người bán lấy từ hồ sơ công ty — không nhập tay.
          </p>
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
            disabled={syncing || !configured}
            className="quote-tool-btn quote-tool-btn-primary text-sm !py-2"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Đang đồng bộ…" : "Đồng bộ MobiFone"}
          </button>
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap items-end gap-3 mb-3">
        <label className="text-sm">
          <span className="text-slate-400 block mb-1">Từ ngày</span>
          <input
            type="date"
            className="input-field"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400 block mb-1">Đến ngày</span>
          <input
            type="date"
            className="input-field"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400 block mb-1">Loại</span>
          <select
            className="input-field"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "out" | "in" | "")}
          >
            <option value="out">{INVOICE_DIRECTION_LABELS.out}</option>
            <option value="in">{INVOICE_DIRECTION_LABELS.in}</option>
          </select>
        </label>
      </div>

      {syncMessage && (
        <p className="text-sm text-emerald-300 mb-3">{syncMessage}</p>
      )}
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
              <th className="py-2 pr-3 text-right">Tiền trước thuế</th>
              <th className="py-2 pr-3 text-right">Thuế</th>
              <th className="py-2 pr-3 text-right">Tổng</th>
              <th className="py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Đang tải…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Chưa có hóa đơn — bấm Đồng bộ MobiFone sau khi cấu hình tài khoản.
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
                  <td className="py-2 pr-3 text-right text-slate-300">
                    {formatVnMoney(inv.totalBeforeTax)}
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-300">
                    {formatVnMoney(inv.totalTax)}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-slate-100">
                    {formatVnMoney(inv.totalAmount)}
                  </td>
                  <td className="py-2 text-slate-400 text-xs">{inv.statusText || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

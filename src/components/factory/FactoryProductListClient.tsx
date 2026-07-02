"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste, Plus } from "lucide-react";
import type { FactoryProduct } from "@/lib/factory/types";
import {
  formatDimensionsMm,
  formatProductPrimaryCode,
  shortDescription,
} from "@/lib/factory/display";
import { parseProductPaste, toProductPayload } from "@/lib/factory/parse-product-paste";

export function FactoryProductListClient({ initialProducts }: { initialProducts: FactoryProduct[] }) {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<FactoryProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const query = q.trim();
      if (!query) {
        setProducts(initialProducts);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/factory/products/search?q=${encodeURIComponent(query)}&limit=100`);
        if (!res.ok) throw new Error("Không tìm được");
        const j = await res.json();
        setProducts(j.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi tìm");
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [q, initialProducts]);

  const parsedRows = useMemo(
    () => (importOpen ? parseProductPaste(pasteText) : []),
    [importOpen, pasteText]
  );

  async function runImport() {
    const rows = parseProductPaste(pasteText);
    if (!rows.length) {
      setError("Không có dòng hợp lệ để nhập");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/factory/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: rows.map(toProductPayload) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Nhập thất bại");
      if (j.errors?.length) {
        setError(`Đã tạo ${j.created} SP. Lỗi: ${j.errors.slice(0, 3).join("; ")}`);
      }
      setImportOpen(false);
      setPasteText("");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi nhập");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Tìm tên, mô tả, mã, NCC, hãng…"
          className="input-field py-1.5 text-sm flex-1 min-w-[14rem] max-w-lg"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading && <span className="text-xs text-slate-500">Đang tìm…</span>}
        <Link href="/erp/san-pham/san-pham/new" className="btn-primary text-sm py-2 inline-flex items-center gap-1">
          <Plus size={16} /> Thêm sản phẩm
        </Link>
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          className="btn-outline text-sm py-2 inline-flex items-center gap-1"
        >
          <ClipboardPaste size={16} /> Dán thêm SP
        </button>
      </div>

      {importOpen && (
        <div className="erp-card p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Dán từ Excel: <strong className="text-slate-300">Tên · Mô tả · Giá · ĐVT · Hãng</strong> (cột cách nhau Tab).
            Mỗi dòng một sản phẩm — hoặc chỉ cột tên.
          </p>
          <textarea
            className="input-field text-sm min-h-[8rem] font-mono"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Tên SP\tMô tả\tGiá\tĐVT\tHãng\n..."}
          />
          {parsedRows.length > 0 && (
            <p className="text-xs text-emerald-400/90">Sẽ tạo {parsedRows.length} sản phẩm.</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={importing || !parsedRows.length}
              onClick={() => void runImport()}
              className="btn-primary text-sm py-1.5 px-4"
            >
              {importing ? "Đang nhập…" : "Nhập"}
            </button>
            <button type="button" onClick={() => setImportOpen(false)} className="btn-outline text-sm py-1.5 px-4">
              Đóng
            </button>
          </div>
        </div>
      )}

      <div className="erp-table-wrap overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="erp-table-head">
            <tr>
              <th className="px-4 py-3 text-left">Tên</th>
              <th className="px-4 py-3 text-left">Mã</th>
              <th className="px-4 py-3 text-left">Kích thước</th>
              <th className="px-4 py-3 text-left">Giá / ĐVT</th>
              <th className="px-4 py-3 text-left">Mô tả ngắn</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {q.trim() ? "Không có sản phẩm khớp." : 'Chưa có sản phẩm — bấm "Thêm" hoặc "Dán thêm SP".'}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="erp-table-row">
                  <td className="px-4 py-3">
                    <Link
                      href={`/erp/san-pham/san-pham/${p.id}`}
                      className="font-medium text-white hover:text-sky hover:underline"
                    >
                      {p.name || "—"}
                    </Link>
                    {p.sourceProjectId ? (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <Link href={`/erp/du-an?p=${p.sourceProjectId}`} className="text-sky/80 hover:underline">
                          Từ dự án #{p.sourceProjectId}
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{formatProductPrimaryCode(p)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                    {formatDimensionsMm(p.lengthMm, p.depthMm, p.heightMm)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {p.price || "—"}
                    {p.unit ? <span className="text-slate-600"> / {p.unit}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[240px]">{shortDescription(p.description)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/erp/san-pham/san-pham/${p.id}`} className="text-sky font-medium hover:underline text-xs">
                      Chi tiết →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

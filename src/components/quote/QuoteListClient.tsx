"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilePlus, FolderKanban, FileText, Pencil, Trash2 } from "lucide-react";
import type { MarketingQuoteSummary } from "@/lib/marketing/quote-types";
import { formatVnMoney } from "@/lib/quote/calc";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export function QuoteListClient() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<MarketingQuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/marketing/quotes");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Không tải được danh sách");
      }
      setQuotes((await res.json()) as MarketingQuoteSummary[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: number) {
    if (!confirm("Xóa báo giá này?")) return;
    const res = await fetch(`/api/marketing/quotes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Không xóa được");
      return;
    }
    void load();
  }

  function openCreateProject(ids: number[], template: "project" | "pi") {
    const q = ids.join(",");
    router.push(`/erp/du-an?create=1&template=${template}&quotes=${q}`);
  }

  return (
    <div className="flex flex-col h-full min-h-0 px-4 pb-4">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 py-4">
        <p className="text-sm text-midnight/60 max-w-2xl">
          Luồng: <strong>Báo giá</strong> → Lưu → Tạo dự án / HĐ → Theo dõi tiến độ.
        </p>
        <Link
          href="/erp/marketing/bao-gia/tao-moi"
          className="quote-tool-btn quote-tool-btn-primary text-sm !py-2"
        >
          <FilePlus size={16} /> Thêm báo giá mới
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-navy/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-mist text-left sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 font-medium">Số BG</th>
              <th className="px-3 py-2.5 font-medium">Tên / Khách</th>
              <th className="px-3 py-2.5 font-medium text-right">Tổng trước thuế</th>
              <th className="px-3 py-2.5 font-medium">Cập nhật</th>
              <th className="px-3 py-2.5 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-midnight/50">
                  Đang tải…
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-midnight/50">
                  Chưa có báo giá — bấm <strong>Thêm báo giá mới</strong>.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className="border-t border-navy/5 hover:bg-mist/40">
                  <td className="px-3 py-2.5 font-mono text-xs">{q.quoteNumber || "—"}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-midnight">{q.quoteName || "Báo giá"}</p>
                    <p className="text-xs text-midnight/55 truncate max-w-md">
                      {q.customerCompany || "—"}
                      {q.customerTaxCode ? ` · MST ${q.customerTaxCode}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    {formatVnMoney(q.grandTotal)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-midnight/55">{formatDate(q.updatedAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Link
                        href={`/erp/marketing/bao-gia/${q.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-navy/15 px-2 py-1 text-xs hover:bg-mist"
                        title="Sửa"
                      >
                        <Pencil size={12} /> Sửa
                      </Link>
                      <button
                        type="button"
                        onClick={() => openCreateProject([q.id], "project")}
                        className="inline-flex items-center gap-1 rounded-lg border border-navy/15 px-2 py-1 text-xs hover:bg-mist"
                        title="Tạo dự án"
                      >
                        <FolderKanban size={12} /> Dự án
                      </button>
                      <button
                        type="button"
                        onClick={() => openCreateProject([q.id], "pi")}
                        className="inline-flex items-center gap-1 rounded-lg border border-navy/15 px-2 py-1 text-xs hover:bg-mist"
                        title="Tạo hợp đồng / PI"
                      >
                        <FileText size={12} /> HĐ
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(q.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        title="Xóa"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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

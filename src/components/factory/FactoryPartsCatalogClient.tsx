"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FactoryPart } from "@/lib/factory/types";

function partCbmM3(len: number, dep: number, h: number): number {
  if (!len || !dep || !h) return 0;
  return (len * dep * h) / 1e9;
}

type Props = {
  initialParts: FactoryPart[];
};

export function FactoryPartsCatalogClient({ initialParts }: Props) {
  const [q, setQ] = useState("");
  const [parts, setParts] = useState<FactoryPart[]>(initialParts);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const url = q.trim()
          ? `/api/factory/parts?q=${encodeURIComponent(q.trim())}`
          : "/api/factory/parts";
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(typeof body.error === "string" ? body.error : "Không tải được danh sách");
        }
        const data = (await res.json()) as FactoryPart[];
        setParts(data);
        setFetchError(null);
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : "Lỗi tải");
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-3">
      {fetchError && (
        <p className="text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{fetchError}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-midnight/65 shrink-0" htmlFor="parts-search">
          Tìm nhanh
        </label>
        <input
          id="parts-search"
          type="search"
          placeholder="Mã hoặc tên chi tiết…"
          className="input-field py-1.5 text-sm max-w-md flex-1 min-w-[200px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {loading && <span className="text-xs text-midnight/45">Đang lọc…</span>}
      </div>

      <div className="bg-white rounded-xl border border-navy/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-mist text-left">
            <tr>
              <th className="px-3 py-3">Mã</th>
              <th className="px-3 py-3">Tên</th>
              <th className="px-3 py-3 text-right">Dài mm</th>
              <th className="px-3 py-3 text-right">Sâu mm</th>
              <th className="px-3 py-3 text-right">Cao mm</th>
              <th className="px-3 py-3 text-right">m³/cái</th>
              <th className="px-3 py-3">Loại VL</th>
              <th className="px-3 py-3 text-right">ĐM SL</th>
              <th className="px-3 py-3">ĐVT</th>
              <th className="px-3 py-3">Spec / ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {parts.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-midnight/50">
                  {q.trim() ? (
                    <>Không có chi tiết khớp “{q.trim()}”. Thử từ khóa khác.</>
                  ) : (
                    <>
                      Chưa có chi tiết. Lưu BOM trên{" "}
                      <Link href="/erp/san-pham/san-pham" className="text-sky hover:underline">
                        sản phẩm
                      </Link>
                      .
                    </>
                  )}
                </td>
              </tr>
            ) : (
              parts.map((p) => {
                const v = partCbmM3(p.lengthMm, p.depthMm, p.heightMm);
                return (
                  <tr key={p.id} className="border-t border-navy/5 hover:bg-mist/40">
                    <td className="px-3 py-2 font-mono text-xs font-medium text-navy">{p.code}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.lengthMm || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.depthMm || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.heightMm || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{v > 0 ? v.toFixed(6) : "—"}</td>
                    <td className="px-3 py-2 text-xs">{p.materialType || "—"}</td>
                    <td className="px-3 py-2 text-right">{p.defaultQty}</td>
                    <td className="px-3 py-2">{p.unit}</td>
                    <td className="px-3 py-2 text-xs text-midnight/70 max-w-[200px] truncate" title={p.specNotes}>
                      {p.specNotes || p.description || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

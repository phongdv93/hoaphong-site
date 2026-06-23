"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, PackagePlus } from "lucide-react";
import type { BomLineInput, BomSection } from "@/lib/factory/types";
import { BOM_SECTION_LABELS } from "@/lib/factory/types";
import type { WoodSpecies } from "@/lib/wood/types";
import type { InventoryItem } from "@/lib/inventory/items";
import { AppSelect } from "@/components/ui/AppSelect";

export const PACKAGING_LOAI_OPTIONS = [
  { value: "", label: "— Chọn loại —" },
  { value: "Âm dương", label: "Âm dương" },
  { value: "Nắp mở", label: "Nắp mở" },
] as const;

const emptyRow = (): BomLineInput => ({
  partCode: "",
  name: "",
  lengthMm: 0,
  depthMm: 0,
  heightMm: 0,
  qty: 1,
  unit: "cái",
  materialType: "",
  specNotes: "",
  remark: "",
});

function computeCbmMm(lengthMm: number, depthMm: number, heightMm: number): number {
  if (!lengthMm || !depthMm || !heightMm) return 0;
  return (lengthMm * depthMm * heightMm) / 1e9;
}

function partRowCbm(row: BomLineInput, showDims: boolean): number {
  if (!showDims) return 0;
  return computeCbmMm(row.lengthMm, row.depthMm, row.heightMm);
}

const BOM_IN =
  "w-full px-1.5 py-1 rounded border border-white/15 bg-[#0f1a2e] text-slate-100 text-[11px] placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky/40";

export function BomBlock({
  section,
  title,
  hint,
  rows,
  setRows,
}: {
  section: BomSection;
  title?: string;
  hint?: string;
  rows: BomLineInput[];
  setRows: Dispatch<SetStateAction<BomLineInput[]>>;
}) {
  const showDims = section !== "hardware";
  const isWood = section === "wood";
  const isHardware = section === "hardware";
  const isPackaging = section === "packaging";
  const displayTitle = title ?? BOM_SECTION_LABELS[section];

  const [species, setSpecies] = useState<WoodSpecies[]>([]);
  const [hwSuggest, setHwSuggest] = useState<Record<number, InventoryItem[]>>({});
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!isWood) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/wood/species");
        if (!res.ok) return;
        const data = (await res.json()) as WoodSpecies[];
        if (!cancelled) setSpecies(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isWood]);

  const fetchHwSuggest = useCallback(async (rowIndex: number, name: string) => {
    if (!isHardware) return;
    const q = name.trim();
    try {
      const res = await fetch(`/api/inventory/items?q=${encodeURIComponent(q)}&category=hardware`);
      if (!res.ok) return;
      const data = (await res.json()) as InventoryItem[];
      setHwSuggest((prev) => ({ ...prev, [rowIndex]: data }));
    } catch {
      setHwSuggest((prev) => ({ ...prev, [rowIndex]: [] }));
    }
  }, [isHardware]);

  function scheduleHwSearch(i: number, name: string) {
    const prev = timers.current.get(i);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => fetchHwSuggest(i, name), 320);
    timers.current.set(i, t);
  }

  function updateRow(i: number, patch: Partial<BomLineInput>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(i: number) {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((_, j) => j !== i)));
  }

  async function addToInventoryRow(i: number) {
    const name = rows[i]?.name?.trim();
    if (!name) {
      alert("Nhập tên vật tư trước");
      return;
    }
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: "hardware", unit: rows[i]?.unit || "cái" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      updateRow(i, { partCode: data.code, name });
      await fetchHwSuggest(i, name);
      alert(`Đã thêm kho: ${data.code}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  }

  const tableMin = showDims ? "min-w-[980px]" : "min-w-[720px]";

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-[#141e32]">
      <div className="bg-white/5 px-3 py-2 border-b border-white/10 flex flex-wrap justify-between gap-2 items-center">
        <div>
          <h3 className="font-semibold text-slate-200 text-sm">{displayTitle}</h3>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
        </div>
        <button type="button" onClick={addRow} className="btn-outline text-xs py-1.5 px-2">
          <Plus size={14} className="inline mr-1" /> Thêm dòng
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full text-[11px] ${tableMin}`}>
          <thead className="bg-white/[0.03] text-left text-slate-400">
            <tr>
              <th className="px-1.5 py-1.5 w-7">#</th>
              <th className="px-1.5 py-1.5 min-w-[88px]">Mã CT</th>
              <th className="px-1.5 py-1.5 min-w-[120px]">Tên</th>
              {isWood && (
                <th className="px-1.5 py-1.5 min-w-[140px] text-[10px]">Loại gỗ (kho)</th>
              )}
              {showDims && (
                <>
                  <th className="px-1.5 py-1.5 w-[72px]">Dài mm</th>
                  <th className="px-1.5 py-1.5 w-[72px]">Sâu mm</th>
                  <th className="px-1.5 py-1.5 w-[72px]">Cao mm</th>
                  <th className="px-1.5 py-1.5 w-[64px]">m³/cái</th>
                </>
              )}
              {isHardware && <th className="px-1.5 py-1.5 min-w-[140px]">Gợi ý kho</th>}
              <th className="px-1.5 py-1.5 w-16">SL</th>
              <th className="px-1.5 py-1.5 w-16">ĐVT</th>
              {isPackaging ? (
                <th className="px-1.5 py-1.5 min-w-[100px]">Loại bao bì</th>
              ) : (
                <th className="px-1.5 py-1.5 min-w-[72px]">Loại VL</th>
              )}
              <th className="px-1.5 py-1.5 min-w-[88px]">Spec</th>
              <th className="px-1.5 py-1.5 min-w-[72px]">Ghi chú</th>
              {isHardware && <th className="px-1.5 py-1.5 w-20"></th>}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-white/10 align-top hover:bg-white/[0.02]">
                <td className="px-1 py-1 text-slate-500">{i + 1}</td>
                <td className="px-0.5 py-0.5">
                  <input
                    className={`${BOM_IN} font-mono`}
                    value={row.partCode}
                    onChange={(e) => updateRow(i, { partCode: e.target.value })}
                    placeholder="Auto / mã kho"
                  />
                </td>
                <td className="px-0.5 py-0.5">
                  <input
                    className={BOM_IN}
                    value={row.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateRow(i, { name: v });
                      if (isHardware) scheduleHwSearch(i, v);
                    }}
                    placeholder={isHardware ? "VD: Vít DFU 4x15…" : "Tên chi tiết"}
                  />
                </td>
                {isWood && (
                  <td className="px-0.5 py-0.5">
                    <AppSelect
                      size="sm"
                      value=""
                      onChange={(v) => {
                        const id = Number(v);
                        if (!id) return;
                        const s = species.find((x) => x.id === id);
                        if (s) updateRow(i, { partCode: s.code, name: s.name });
                      }}
                      options={[
                        { value: "", label: "— Chọn loại gỗ kho —" },
                        ...species.map((s) => ({
                          value: String(s.id),
                          label: `${s.code} — ${s.name}`,
                        })),
                      ]}
                    />
                  </td>
                )}
                {showDims && (
                  <>
                    <td className="px-0.5 py-0.5">
                      <input
                        type="number"
                        className={BOM_IN}
                        value={row.lengthMm || ""}
                        onChange={(e) => updateRow(i, { lengthMm: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-0.5 py-0.5">
                      <input
                        type="number"
                        className={BOM_IN}
                        value={row.depthMm || ""}
                        onChange={(e) => updateRow(i, { depthMm: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-0.5 py-0.5">
                      <input
                        type="number"
                        className={BOM_IN}
                        value={row.heightMm || ""}
                        onChange={(e) => updateRow(i, { heightMm: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-0.5 py-0.5 text-slate-400 whitespace-nowrap" title="Dài×Sâu×Cao / 10⁹">
                      {partRowCbm(row, showDims) > 0 ? partRowCbm(row, showDims).toFixed(6) : "—"}
                    </td>
                  </>
                )}
                {isHardware && (
                  <td className="px-0.5 py-0.5">
                    <div className="max-h-24 overflow-y-auto border border-white/10 rounded bg-[#0f1a2e]">
                      {(hwSuggest[i] ?? []).length === 0 ? (
                        <p className="px-1 py-1 text-slate-500 text-[10px]">Gõ tên để tìm…</p>
                      ) : (
                        hwSuggest[i]!.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            className="block w-full text-left px-1.5 py-0.5 hover:bg-sky/15 text-[10px] truncate text-slate-200"
                            title={it.name}
                            onClick={() => updateRow(i, { partCode: it.code, name: it.name, unit: it.unit || row.unit })}
                          >
                            <span className="font-mono text-sky-light">{it.code}</span> {it.name}
                          </button>
                        ))
                      )}
                    </div>
                  </td>
                )}
                <td className="px-0.5 py-0.5">
                  <input
                    type="number"
                    step="0.01"
                    className={BOM_IN}
                    value={row.qty}
                    onChange={(e) => updateRow(i, { qty: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-0.5 py-0.5">
                  <input
                    className={BOM_IN}
                    value={row.unit}
                    onChange={(e) => updateRow(i, { unit: e.target.value })}
                  />
                </td>
                {isPackaging ? (
                  <td className="px-0.5 py-0.5">
                    <AppSelect
                      size="sm"
                      value={row.materialType}
                      onChange={(v) => updateRow(i, { materialType: v })}
                      options={PACKAGING_LOAI_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                    />
                  </td>
                ) : (
                  <td className="px-0.5 py-0.5">
                    <input
                      className={BOM_IN}
                      value={row.materialType}
                      onChange={(e) => updateRow(i, { materialType: e.target.value })}
                      placeholder={isHardware ? "—" : "gỗ…"}
                      readOnly={isHardware}
                    />
                  </td>
                )}
                <td className="px-0.5 py-0.5">
                  <input
                    className={BOM_IN}
                    value={row.specNotes}
                    onChange={(e) => updateRow(i, { specNotes: e.target.value })}
                  />
                </td>
                <td className="px-0.5 py-0.5">
                  <input
                    className={BOM_IN}
                    value={row.remark}
                    onChange={(e) => updateRow(i, { remark: e.target.value })}
                  />
                </td>
                {isHardware && (
                  <td className="px-0.5 py-0.5">
                    <button
                      type="button"
                      className="btn-outline text-[10px] py-1 px-1.5 w-full flex items-center justify-center gap-0.5"
                      onClick={() => addToInventoryRow(i)}
                      title="Thêm tên hiện tại vào kho vật tư"
                    >
                      <PackagePlus size={12} /> Kho
                    </button>
                  </td>
                )}
                <td className="px-0.5 py-0.5">
                  <button type="button" className="p-0.5 text-rose-400 hover:bg-rose-500/15 rounded" onClick={() => removeRow(i)}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

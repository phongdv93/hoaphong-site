"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProductSupplierOfferInput } from "@/lib/suppliers/types";
import { SupplierPicker } from "@/components/suppliers/SupplierPicker";

type OfferRow = ProductSupplierOfferInput & { supplierName?: string };

export function ProductSupplierOffersEditor({
  offers,
  onChange,
  disabled,
}: {
  offers: OfferRow[];
  onChange: (offers: OfferRow[]) => void;
  disabled?: boolean;
}) {
  function updateRow(index: number, patch: Partial<OfferRow>) {
    const next = offers.map((o, i) => (i === index ? { ...o, ...patch } : o));
    onChange(next);
  }

  function addRow() {
    onChange([
      ...offers,
      { supplierId: 0, unitPrice: "", leadTimeDays: null, isPreferred: offers.length === 0, notes: "" },
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-300">Nhà cung cấp & giá</p>
        <button
          type="button"
          disabled={disabled}
          onClick={addRow}
          className="text-[10px] px-2 py-1 rounded border border-white/15 text-slate-300 hover:bg-white/10 inline-flex items-center gap-1"
        >
          <Plus size={12} /> Thêm NCC
        </button>
      </div>
      {offers.length === 0 ? (
        <p className="text-[11px] text-slate-500">Chưa có NCC — thêm tên NCC (chi tiết bổ sung sau).</p>
      ) : (
        <div className="space-y-2">
          {offers.map((row, index) => (
            <div
              key={`${row.supplierId}-${index}`}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-lg border border-white/10 bg-white/[0.02] p-2"
            >
              <div className="sm:col-span-4">
                <label className="block text-[10px] text-slate-500 mb-0.5">NCC</label>
                <SupplierPicker
                  valueId={row.supplierId || null}
                  valueName={row.supplierName ?? ""}
                  disabled={disabled}
                  onChange={(s) => {
                    if (!s) {
                      updateRow(index, { supplierId: 0, supplierName: "" });
                      return;
                    }
                    updateRow(index, {
                      supplierId: s.id,
                      supplierName: s.name,
                      isPreferred: row.isPreferred || offers.length === 1,
                    });
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5">Giá</label>
                <input
                  className="input-field py-1.5 text-xs w-full"
                  value={row.unitPrice ?? ""}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-slate-500 mb-0.5">Lead (ngày)</label>
                <input
                  type="number"
                  className="input-field py-1.5 text-xs w-full"
                  value={row.leadTimeDays ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    updateRow(index, {
                      leadTimeDays: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 pb-1">
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <input
                    type="radio"
                    name="preferred-supplier"
                    checked={Boolean(row.isPreferred)}
                    disabled={disabled}
                    onChange={() =>
                      onChange(
                        offers.map((o, i) => ({ ...o, isPreferred: i === index }))
                      )
                    }
                  />
                  Ưu tiên
                </label>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(offers.filter((_, i) => i !== index))}
                  className="text-rose-400 hover:text-rose-300 ml-auto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

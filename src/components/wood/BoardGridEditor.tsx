"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BoardGridLayout } from "@/lib/wood/grid";

export function BoardGridEditor({
  grid,
  onChange,
}: {
  grid: BoardGridLayout;
  onChange: (g: BoardGridLayout) => void;
}) {
  const { columnWidths, rows } = grid;

  function setWidth(col: number, value: string) {
    const w = Number(value) || 0;
    const columnWidths = [...grid.columnWidths];
    columnWidths[col] = w;
    onChange({ ...grid, columnWidths });
  }

  function setQty(row: number, col: number, value: string) {
    const rows = grid.rows.map((r) => [...r]);
    rows[row][col] = Math.max(0, parseInt(value, 10) || 0);
    onChange({ ...grid, rows });
  }

  function addColumn() {
    const last = columnWidths[columnWidths.length - 1] ?? 100;
    onChange({
      columnWidths: [...columnWidths, last + 10],
      rows: rows.map((r) => [...r, 0]),
    });
  }

  function removeColumn(col: number) {
    if (columnWidths.length <= 1) return;
    onChange({
      columnWidths: columnWidths.filter((_, i) => i !== col),
      rows: rows.map((r) => r.filter((_, i) => i !== col)),
    });
  }

  function addRow() {
    onChange({
      ...grid,
      rows: [...rows, Array(columnWidths.length).fill(0)],
    });
  }

  function removeRow(row: number) {
    if (rows.length <= 1) return;
    onChange({ ...grid, rows: rows.filter((_, i) => i !== row) });
  }

  const totalBoards = rows.reduce((s, r) => s + r.reduce((a, q) => a + q, 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-midnight/50">
        Cột = chiều rộng thanh (mm). Hàng = lớp xếp trong kiện (dưới → trên). Ô = số thanh tại vị trí đó.
      </p>
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse min-w-full">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-xs text-midnight/50 w-16">Hàng</th>
              {columnWidths.map((w, c) => (
                <th key={c} className="px-1 py-1 border border-navy/10 bg-mist/80">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={w || ""}
                      onChange={(e) => setWidth(c, e.target.value)}
                      className="w-16 border rounded px-1 py-0.5 text-xs"
                      placeholder="rộng"
                    />
                    <span className="text-[10px] text-midnight/40">mm</span>
                    {columnWidths.length > 1 && (
                      <button type="button" onClick={() => removeColumn(c)} className="text-red-400 p-0.5">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-2">
                <button type="button" onClick={addColumn} className="text-sky text-xs flex items-center gap-0.5">
                  <Plus size={14} /> Cột
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <td className="px-2 text-xs text-midnight/50">
                  {r + 1}
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(r)} className="block text-red-400 mt-0.5">
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
                {row.map((qty, c) => (
                  <td key={c} className="border border-navy/10 p-1">
                    <input
                      type="number"
                      min={0}
                      value={qty || ""}
                      onChange={(e) => setQty(r, c, e.target.value)}
                      className="w-14 text-center border rounded px-1 py-1"
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} className="text-sm text-sky flex items-center gap-1">
        <Plus size={16} /> Thêm hàng (lớp)
      </button>
      <p className="text-xs font-medium text-navy">Tổng: {totalBoards} thanh trong lưới</p>
    </div>
  );
}

"use client";

import type { BoardGridLayout } from "@/lib/wood/grid";
import type { WoodBoard } from "@/lib/wood/types";
import { formatMm } from "@/lib/wood/volume";

/** Map board ids to grid cells by matching layer row + width column */
function mapBoardsToCells(
  grid: BoardGridLayout,
  boards: WoodBoard[]
): Map<string, number[]> {
  const available = boards.filter((b) => b.status === "available");
  const byWidth = new Map<number, WoodBoard[]>();
  for (const b of available) {
    if (!byWidth.has(b.widthMm)) byWidth.set(b.widthMm, []);
    byWidth.get(b.widthMm)!.push(b);
  }
  for (const list of byWidth.values()) {
    list.sort((a, b) => b.posY - a.posY || a.posX - b.posX || a.seqNo - b.seqNo);
  }

  const cellIds = new Map<string, number[]>();
  for (let r = 0; r < grid.rows.length; r++) {
    for (let c = 0; c < grid.columnWidths.length; c++) {
      const need = grid.rows[r][c] ?? 0;
      if (need <= 0) continue;
      const w = grid.columnWidths[c];
      const pool = byWidth.get(w) ?? [];
      const picked = pool.splice(0, need).map((b) => b.id);
      cellIds.set(`${r}-${c}`, picked);
    }
  }
  const rest = [...byWidth.values()].flat();
  if (rest.length) {
    cellIds.set("__extra__", rest.map((b) => b.id));
  }
  return cellIds;
}

export function BoardGridView({
  grid,
  boards,
  selectedIds,
  onToggleBoard,
  onToggleCell,
}: {
  grid: BoardGridLayout;
  boards: WoodBoard[];
  selectedIds: Set<number>;
  onToggleBoard?: (id: number) => void;
  onToggleCell?: (ids: number[]) => void;
}) {
  const cellMap = mapBoardsToCells(grid, boards);
  const issuedCount = boards.filter((b) => b.status === "issued").length;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse w-full">
          <thead>
            <tr>
              <th className="px-2 py-1 text-xs text-midnight/50">Hàng</th>
              {grid.columnWidths.map((w, c) => (
                <th key={c} className="px-2 py-1 border border-navy/10 bg-mist text-xs font-medium">
                  {formatMm(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, r) => (
              <tr key={r}>
                <td className="px-2 text-xs text-midnight/50">{r + 1}</td>
                {row.map((qty, c) => {
                  const ids = cellMap.get(`${r}-${c}`) ?? [];
                  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
                  const someSelected = ids.some((id) => selectedIds.has(id));
                  const clickable = onToggleCell && ids.length > 0;
                  return (
                    <td
                      key={c}
                      className={`border border-navy/10 p-2 text-center align-middle min-w-[4rem] ${
                        clickable ? "cursor-pointer hover:bg-sky/10" : ""
                      } ${allSelected ? "bg-sky/20 ring-1 ring-sky" : someSelected ? "bg-sky/10" : ""}`}
                      onClick={() => clickable && onToggleCell(ids)}
                    >
                      {qty > 0 ? (
                        <span className="text-sm font-medium">{qty}</span>
                      ) : (
                        <span className="text-midnight/20">—</span>
                      )}
                      {ids.length > 0 && onToggleBoard && (
                        <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
                          {ids.map((id) => {
                            const b = boards.find((x) => x.id === id);
                            if (!b) return null;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleBoard(id);
                                }}
                                className={`text-[10px] px-1 rounded ${
                                  selectedIds.has(id) ? "bg-sky text-white" : "bg-mist text-midnight/70"
                                }`}
                              >
                                #{b.seqNo}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {issuedCount > 0 && (
        <p className="text-xs text-midnight/50">{issuedCount} thanh đã phát (không hiển thị trên lưới khả dụng)</p>
      )}
    </div>
  );
}

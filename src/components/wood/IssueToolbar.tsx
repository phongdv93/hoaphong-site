"use client";

import type { WoodBoard, ProductionOrder } from "@/lib/wood/types";
import { autoSelectBoardsForVolume } from "@/lib/wood/autoSelect";
import { PoVolumeStatus } from "./PoVolumeStatus";

export function IssueToolbar({
  boards,
  selectedIds,
  onChangeSelection,
  po,
  selectedVolumeM3,
}: {
  boards: WoodBoard[];
  selectedIds: Set<number>;
  onChangeSelection: (ids: Set<number>) => void;
  po: ProductionOrder | null | undefined;
  selectedVolumeM3: number;
}) {
  const available = boards.filter((b) => b.status === "available");

  function selectAll() {
    onChangeSelection(new Set(available.map((b) => b.id)));
  }

  function clearAll() {
    onChangeSelection(new Set());
  }

  function autoForPo() {
    if (!po) return;
    const target = po.requiredVolumeM3;
    if (target == null || target <= 0) return;
    const alreadyOnPo = po.issuedVolumeM3 ?? 0;
    const need = Math.max(0, target - alreadyOnPo);
    onChangeSelection(autoSelectBoardsForVolume(boards, need, new Set()));
  }

  return (
    <div className="space-y-3">
      <PoVolumeStatus po={po} selectedVolumeM3={selectedVolumeM3} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={autoForPo}
          disabled={!po?.requiredVolumeM3}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-navy/15 hover:bg-mist disabled:opacity-40"
          title="Chọn thanh từ trên xuống đến đủ khối PO còn thiếu"
        >
          Tự động (đủ khối PO)
        </button>
        <button
          type="button"
          onClick={selectAll}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-navy/15 hover:bg-mist"
        >
          Chọn tất cả
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-navy/15 hover:bg-mist"
        >
          Bỏ chọn
        </button>
        <span className="text-xs text-midnight/50 self-center">· Kéo chuột trên 3D để chọn theo vùng</span>
      </div>
    </div>
  );
}

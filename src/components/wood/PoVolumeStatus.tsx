"use client";

import { formatM3 } from "@/lib/wood/volume";
import { getPoVolumeState } from "@/lib/wood/poVolume";
import type { ProductionOrder } from "@/lib/wood/types";

export function PoVolumeStatus({
  po,
  selectedVolumeM3,
}: {
  po: ProductionOrder | null | undefined;
  selectedVolumeM3: number;
}) {
  const info = getPoVolumeState(po, selectedVolumeM3);

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${info.className}`}>
      <p className="font-semibold">{info.label}</p>
      {info.required != null && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] opacity-90">
          <span>Yêu cầu PO:</span>
          <span className="text-right">{formatM3(info.required)}</span>
          <span>Đã phát trước:</span>
          <span className="text-right">{formatM3(info.alreadyIssued)}</span>
          <span>Đang chọn:</span>
          <span className="text-right">{formatM3(info.selected)}</span>
          <span>Sau khi phát:</span>
          <span className="text-right font-medium">{formatM3(info.totalAfterIssue)}</span>
        </div>
      )}
    </div>
  );
}


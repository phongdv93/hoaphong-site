import type { WoodBoard } from "./types";

/** Chọn thanh từ trên xuống (posY cao → thấp) đến khi đủ khối mục tiêu */
export function autoSelectBoardsForVolume(
  boards: WoodBoard[],
  targetVolumeM3: number,
  alreadySelected: Set<number> = new Set()
): Set<number> {
  const available = boards
    .filter((b) => b.status === "available")
    .sort((a, b) => b.posY - a.posY || a.posX - b.posX || a.seqNo - b.seqNo);

  const next = new Set(alreadySelected);
  let vol = [...next]
    .map((id) => boards.find((b) => b.id === id))
    .filter(Boolean)
    .reduce((s, b) => s + (b as WoodBoard).volumeM3, 0);

  for (const b of available) {
    if (vol >= targetVolumeM3 - 1e-6) break;
    if (!next.has(b.id)) {
      next.add(b.id);
      vol += b.volumeM3;
    }
  }
  return next;
}

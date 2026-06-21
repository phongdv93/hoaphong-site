import type { ProductionOrder } from "./types";

export type PoVolumeState = "no_target" | "short" | "exact" | "over";

const TOL = 0.0005;

export function getPoVolumeState(
  po: ProductionOrder | null | undefined,
  selectedVolumeM3: number
): {
  state: PoVolumeState;
  required: number | null;
  alreadyIssued: number;
  selected: number;
  totalAfterIssue: number;
  remaining: number | null;
  label: string;
  className: string;
} {
  const alreadyIssued = po?.issuedVolumeM3 ?? 0;
  const selected = selectedVolumeM3;
  const totalAfterIssue = alreadyIssued + selected;
  const required = po?.requiredVolumeM3 ?? null;

  if (required == null || required <= 0) {
    return {
      state: "no_target",
      required,
      alreadyIssued,
      selected,
      totalAfterIssue,
      remaining: null,
      label: "PO chưa khai báo khối yêu cầu",
      className: "text-midnight/60",
    };
  }

  const remaining = required - totalAfterIssue;
  if (totalAfterIssue < required - TOL) {
    return {
      state: "short",
      required,
      alreadyIssued,
      selected,
      totalAfterIssue,
      remaining,
      label: `Chưa đủ — còn thiếu ~${remaining.toFixed(4)} m³`,
      className: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }
  if (totalAfterIssue > required + TOL) {
    return {
      state: "over",
      required,
      alreadyIssued,
      selected,
      totalAfterIssue,
      remaining,
      label: `Dư khối — vượt ~${(-remaining).toFixed(4)} m³ so với PO`,
      className: "text-red-700 bg-red-50 border-red-200",
    };
  }
  return {
    state: "exact",
    required,
    alreadyIssued,
    selected,
    totalAfterIssue,
    remaining: 0,
    label: "Đủ khối cho PO này",
    className: "text-emerald-800 bg-emerald-50 border-emerald-200",
  };
}

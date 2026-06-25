import type { PhaseKind } from "./types";

export type PhaseSuggestionId = "construction" | "interior" | "export" | "general";

export type PhaseSuggestionTemplate = {
  id: PhaseSuggestionId;
  label: string;
  description: string;
  phases: { kind: PhaseKind; name: string }[];
};

/** Gợi ý 3 công đoạn theo ngành — dùng khi tạo dự án mới. */
export const PHASE_SUGGESTION_TEMPLATES: PhaseSuggestionTemplate[] = [
  {
    id: "construction",
    label: "Xây dựng",
    description: "Thiết kế → thi công → nghiệm thu",
    phases: [
      { kind: "design", name: "Thiết kế & bản vẽ" },
      { kind: "structural", name: "Thi công phần thô" },
      { kind: "finishing", name: "Hoàn thiện & nghiệm thu" },
    ],
  },
  {
    id: "interior",
    label: "Nội thất",
    description: "SX → lắp đặt → bàn giao",
    phases: [
      { kind: "interior", name: "Sản xuất" },
      { kind: "interior", name: "Lắp đặt tại công trình" },
      { kind: "finishing", name: "Bàn giao & nghiệm thu" },
    ],
  },
  {
    id: "export",
    label: "Xuất khẩu",
    description: "SX → đóng gói → giao hàng",
    phases: [
      { kind: "custom", name: "Sản xuất" },
      { kind: "custom", name: "Đóng gói & kiểm hàng" },
      { kind: "custom", name: "Giao hàng" },
    ],
  },
  {
    id: "general",
    label: "Chung",
    description: "Kế hoạch → thực hiện → hoàn thành",
    phases: [
      { kind: "custom", name: "Kế hoạch" },
      { kind: "custom", name: "Thực hiện" },
      { kind: "custom", name: "Hoàn thành" },
    ],
  },
];

export function defaultSuggestionForMode(mode: "free" | "pi"): PhaseSuggestionId {
  return mode === "pi" ? "export" : "general";
}

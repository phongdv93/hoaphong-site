"use client";

import { Sparkles } from "lucide-react";
import {
  defaultSuggestionForMode,
  PHASE_SUGGESTION_TEMPLATES,
  type PhaseSuggestionId,
} from "@/lib/projects/phase-suggestions";

/** Gợi ý nhanh 3 công đoạn theo ngành khi wizard chưa có công đoạn nào. */
export function WizardPhaseSuggestions({
  projectId,
  creationMode,
  phaseCount,
  hasItems,
  onApplied,
}: {
  projectId: number;
  creationMode: "free" | "pi";
  phaseCount: number;
  hasItems: boolean;
  onApplied: () => void;
}) {
  if (phaseCount > 0) return null;

  const highlight = defaultSuggestionForMode(creationMode);

  async function applyTemplate(id: PhaseSuggestionId) {
    const tpl = PHASE_SUGGESTION_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    for (let i = 0; i < tpl.phases.length; i++) {
      const p = tpl.phases[i];
      const res = await fetch(`/api/projects/${projectId}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: p.kind,
          name: p.name,
          sortOrder: (i + 1) * 10,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(typeof j.error === "string" ? j.error : "Thêm công đoạn thất bại");
        onApplied();
        return;
      }
      const { id: phaseId } = await res.json();
      if (hasItems && phaseId) {
        await fetch(`/api/projects/${projectId}/phases/${phaseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progressFromItems: true }),
        });
      }
    }
    onApplied();
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-2">
      <p className="text-[11px] text-amber-100/90 flex items-center gap-1.5">
        <Sparkles size={13} className="shrink-0" />
        Gợi ý 3 công đoạn theo ngành — bấm để thêm, sau đó sửa tên / thời gian bên dưới.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PHASE_SUGGESTION_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => void applyTemplate(t.id)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              t.id === highlight
                ? "border-sky/50 bg-sky/20 text-sky-light"
                : "border-white/20 text-slate-300 hover:bg-white/10"
            }`}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

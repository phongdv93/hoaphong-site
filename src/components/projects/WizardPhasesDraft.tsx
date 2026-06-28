"use client";

import { Sparkles, Trash2 } from "lucide-react";
import {
  defaultSuggestionForMode,
  PHASE_SUGGESTION_TEMPLATES,
  type PhaseSuggestionId,
} from "@/lib/projects/phase-suggestions";
import type { WizardDraftPhase } from "@/lib/projects/wizard-draft";
import { newTempId } from "@/lib/projects/wizard-draft";

export function WizardPhasesDraft({
  creationMode,
  phases,
  hasItems,
  onChange,
}: {
  creationMode: "free" | "pi";
  phases: WizardDraftPhase[];
  hasItems: boolean;
  onChange: (phases: WizardDraftPhase[]) => void;
}) {
  const highlight = defaultSuggestionForMode(creationMode);

  function applyTemplate(id: PhaseSuggestionId) {
    const tpl = PHASE_SUGGESTION_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    onChange(
      tpl.phases.map((p, i) => ({
        tempId: newTempId(),
        kind: p.kind,
        name: p.name,
        sortOrder: (i + 1) * 10,
        progressFromItems: hasItems,
      }))
    );
  }

  function updateName(tempId: string, name: string) {
    onChange(phases.map((p) => (p.tempId === tempId ? { ...p, name } : p)));
  }

  function removePhase(tempId: string) {
    onChange(phases.filter((p) => p.tempId !== tempId));
  }

  return (
    <div className="space-y-3">
      {phases.length === 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-2">
          <p className="text-[11px] text-amber-100/90 flex items-center gap-1.5">
            <Sparkles size={13} className="shrink-0" />
            Gợi ý 3 công đoạn theo ngành — bấm để thêm, sau đó sửa tên bên dưới.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PHASE_SUGGESTION_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.id)}
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
      )}

      {phases.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-white/10 rounded-lg">
          Chưa có công đoạn — chọn gợi ý hoặc bỏ qua bước này.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10 overflow-hidden">
          {phases.map((ph) => (
            <li
              key={ph.tempId}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.02]"
            >
              <input
                value={ph.name}
                onChange={(e) => updateName(ph.tempId, e.target.value)}
                className="input-field text-sm flex-1 min-w-0 h-[30px]"
              />
              <button
                type="button"
                onClick={() => removePhase(ph.tempId)}
                className="p-1 text-slate-500 hover:text-rose-400 shrink-0"
                title="Xóa"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

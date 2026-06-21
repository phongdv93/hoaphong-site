"use client";

import type { MasterHint } from "./useCustomsMasterHints";

export function MasterDataHints({
  hints,
  onPick,
}: {
  hints: MasterHint[];
  onPick: (code: string) => void;
}) {
  if (!hints.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {hints.map((h) => (
        <button
          key={h.code}
          type="button"
          onClick={() => onPick(h.code)}
          className="text-[10px] px-2 py-0.5 rounded bg-white/8 text-slate-300 hover:bg-sky/20 max-w-full truncate"
          title={[h.name, h.extra].filter(Boolean).join(" · ")}
        >
          <span className="font-mono">{h.code}</span>
          {h.name ? <span className="text-slate-500 ml-1">{h.name.slice(0, 28)}</span> : null}
        </button>
      ))}
    </div>
  );
}

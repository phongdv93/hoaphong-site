"use client";

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc nội dung">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all border ${
              active
                ? "bg-sky/20 border-sky/45 text-sky-light"
                : "border-white/10 text-slate-muted hover:text-white hover:border-white/25 bg-white/[0.03]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

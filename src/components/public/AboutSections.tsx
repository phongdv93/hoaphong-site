"use client";

import { useMemo, useState } from "react";
import { Building2, Code, Hammer, Package, type LucideIcon } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { FilterChips } from "./FilterChips";

const MILESTONE_ICONS: Record<string, LucideIcon> = {
  hammer: Hammer,
  building: Building2,
  package: Package,
  code: Code,
};

const ABOUT_PANEL_TRANSITION =
  "transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]";

export type MilestoneData = {
  id: string;
  iconKey: keyof typeof MILESTONE_ICONS | string;
  year: string;
  title: string;
  desc: string;
};

function MilestoneExpanded({ m }: { m: MilestoneData }) {
  const Icon = MILESTONE_ICONS[m.iconKey] ?? Building2;
  return (
    <article className="public-card h-full w-full flex flex-col md:flex-row gap-6 md:gap-10 p-6 md:p-10 overflow-y-auto">
      <div className="flex flex-col items-start md:w-52 shrink-0">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky to-royal flex items-center justify-center text-white mb-5 shadow-lg shadow-sky/20">
          <Icon className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-sky-light uppercase tracking-wider">{m.year}</p>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h2 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight">{m.title}</h2>
        <p className="text-base md:text-lg text-slate-muted mt-5 leading-relaxed">{m.desc}</p>
      </div>
    </article>
  );
}

function MilestoneCompact({ m, onSelect }: { m: MilestoneData; onSelect: () => void }) {
  const Icon = MILESTONE_ICONS[m.iconKey] ?? Building2;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="public-card-compact h-full max-h-full min-h-0 flex flex-col text-left w-full overflow-hidden hover:border-sky/40"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky to-royal flex items-center justify-center text-white mb-2 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[10px] font-semibold text-sky-light uppercase tracking-wider shrink-0">{m.year}</p>
      <h3 className="font-display text-sm font-semibold text-white mt-1 leading-snug line-clamp-2 shrink-0">{m.title}</h3>
      <p className="text-xs text-slate-muted mt-1.5 line-clamp-3 leading-relaxed min-h-0">{m.desc}</p>
      <span className="text-[10px] text-sky-light/70 mt-auto pt-2 shrink-0">Chi tiết →</span>
    </button>
  );
}

export function AboutSections({
  imageSrc,
  imageAlt,
  aboutContent,
  address,
  email,
  phone,
  milestones,
}: {
  imageSrc: string;
  imageAlt: string;
  aboutContent: string;
  address: string;
  email: string;
  phone: string;
  milestones: MilestoneData[];
}) {
  const [filter, setFilter] = useState("all");
  const options = useMemo(
    () => [{ id: "all", label: "Tất cả" }, ...milestones.map((m) => ({ id: m.id, label: m.year }))],
    [milestones]
  );

  const selected = filter === "all" ? null : milestones.find((m) => m.id === filter) ?? null;
  const showAll = filter === "all";

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100dvh-9.5rem)] max-h-[calc(100dvh-9.5rem)] sm:min-h-[calc(100dvh-9rem)] sm:max-h-[calc(100dvh-9rem)] gap-3">
      <div className="shrink-0">
        <FilterChips options={options} value={filter} onChange={setFilter} />
      </div>

      <div className="about-content-stage relative flex-1 min-h-0 overflow-hidden">
        {/* Tất cả — chia 2 hàng cố định trong khung */}
        <div
          className={`absolute inset-0 grid grid-rows-[minmax(0,52%)_minmax(0,48%)] gap-3 min-h-0 ${ABOUT_PANEL_TRANSITION} ${
            showAll
              ? "opacity-100 pointer-events-auto z-10"
              : "opacity-0 pointer-events-none z-0"
          }`}
        >
          <div className="grid lg:grid-cols-12 gap-3 min-h-0 h-full overflow-hidden">
            <div className="lg:col-span-5 relative h-full min-h-0 rounded-xl overflow-hidden border border-white/10">
              <SafeImage
                src={imageSrc}
                alt={imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="lg:col-span-7 public-card flex flex-col justify-center p-4 md:p-6 min-h-0 h-full overflow-y-auto">
              <p className="text-sm text-slate-muted leading-relaxed whitespace-pre-line line-clamp-[8] lg:line-clamp-none">
                {aboutContent}
              </p>
              <dl className="mt-4 grid sm:grid-cols-3 gap-3 text-xs shrink-0">
                <div>
                  <dt className="text-slate-muted/80 uppercase tracking-wide text-[10px]">Địa chỉ</dt>
                  <dd className="text-white mt-0.5">{address}</dd>
                </div>
                <div>
                  <dt className="text-slate-muted/80 uppercase tracking-wide text-[10px]">Email</dt>
                  <dd className="text-white mt-0.5 break-all">{email}</dd>
                </div>
                <div>
                  <dt className="text-slate-muted/80 uppercase tracking-wide text-[10px]">Hotline</dt>
                  <dd className="text-white mt-0.5">{phone}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-h-0 h-full max-h-full overflow-hidden">
            {milestones.map((m) => (
              <MilestoneCompact key={m.id} m={m} onSelect={() => setFilter(m.id)} />
            ))}
          </div>
        </div>

        {milestones.map((m) => (
          <div
            key={m.id}
            className={`absolute inset-0 ${ABOUT_PANEL_TRANSITION} ${
              selected?.id === m.id
                ? "opacity-100 pointer-events-auto z-20"
                : "opacity-0 pointer-events-none z-0"
            }`}
          >
            <MilestoneExpanded m={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

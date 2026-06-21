"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { FilterChips } from "./FilterChips";
import { ServiceIcon } from "@/components/ServiceIcon";
import type { Service } from "@/lib/types";

export function ServicesList({ services }: { services: Service[] }) {
  const [filter, setFilter] = useState("all");

  const options = useMemo(
    () => [
      { id: "all", label: "Tất cả" },
      ...services.map((s) => ({ id: String(s.id), label: s.name })),
    ],
    [services]
  );

  const visible =
    filter === "all" ? services : services.filter((s) => String(s.id) === filter);

  return (
    <>
      <FilterChips options={options} value={filter} onChange={setFilter} />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map((s) => {
          const features = JSON.parse(s.features || "[]") as string[];
          return (
            <article key={s.id} className="public-card-compact group flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky to-royal flex items-center justify-center text-white shrink-0">
                  <ServiceIcon name={s.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-sm font-semibold text-white leading-snug">{s.name}</h2>
                  <p className="text-[11px] text-slate-muted mt-1 line-clamp-2 leading-relaxed">{s.description}</p>
                </div>
              </div>
              {features.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {features.slice(0, 2).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[10px] text-slate-muted">
                      <Check size={12} className="text-sky-light shrink-0" />
                      <span className="line-clamp-1">{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/lien-he" className="public-link text-[11px] mt-2">
                Tư vấn →
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}

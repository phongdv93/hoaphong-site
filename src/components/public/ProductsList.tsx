"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { FilterChips } from "./FilterChips";
import type { Product } from "@/lib/types";

export function ProductsList({ products }: { products: Product[] }) {
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const [filter, setFilter] = useState("all");

  const options = useMemo(
    () => [{ id: "all", label: "Tất cả" }, ...categories.map((c) => ({ id: c, label: c }))],
    [categories]
  );

  const visible = filter === "all" ? products : products.filter((p) => p.category === filter);

  if (products.length === 0) {
    return <p className="public-body text-sm">Chưa có sản phẩm.</p>;
  }

  return (
    <>
      {categories.length > 1 && <FilterChips options={options} value={filter} onChange={setFilter} />}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 ${categories.length > 1 ? "mt-4" : ""}`}>
        {visible.map((p) => (
          <article key={p.id} className="public-card-compact group overflow-hidden !p-0 flex flex-col">
            {p.image ? (
              <div className="relative h-24 bg-navy-light">
                <SafeImage
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="200px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {p.featured === 1 && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-sky text-[9px] font-medium text-white">
                    Nổi bật
                  </span>
                )}
              </div>
            ) : (
              <div className="h-16 bg-white/5 border-b border-white/5" />
            )}
            <div className="p-2.5 flex flex-col flex-1">
              <p className="text-[9px] text-sky-light/80 uppercase tracking-wide truncate">{p.category}</p>
              <h3 className="font-display text-xs font-semibold text-white mt-0.5 line-clamp-2 leading-snug">{p.name}</h3>
              <p className="text-[10px] text-slate-muted line-clamp-2 mt-1 flex-1">{p.description}</p>
              <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-white/5">
                <span className="text-[10px] text-sky-light font-semibold truncate">{p.price}</span>
                <Link href="/lien-he" className="public-link text-[10px] shrink-0">
                  Liên hệ
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

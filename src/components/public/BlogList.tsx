"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { FilterChips } from "./FilterChips";
import type { BlogPost } from "@/lib/types";

function yearOf(iso: string) {
  return new Date(iso).getFullYear().toString();
}

export function BlogList({ posts }: { posts: BlogPost[] }) {
  const years = useMemo(() => [...new Set(posts.map((p) => yearOf(p.createdAt)))].sort((a, b) => Number(b) - Number(a)), [posts]);
  const [filter, setFilter] = useState("all");

  const options = useMemo(
    () => [{ id: "all", label: "Tất cả" }, ...years.map((y) => ({ id: y, label: y }))],
    [years]
  );

  const visible = filter === "all" ? posts : posts.filter((p) => yearOf(p.createdAt) === filter);

  if (posts.length === 0) {
    return <p className="public-body text-sm">Chưa có bài viết nào.</p>;
  }

  return (
    <>
      {years.length > 1 && <FilterChips options={options} value={filter} onChange={setFilter} />}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${years.length > 1 ? "mt-4" : ""}`}>
        {visible.map((post) => (
          <article key={post.id} className="public-card-compact group overflow-hidden !p-0 flex flex-col">
            {post.coverImage ? (
              <div className="relative h-28 bg-navy-light">
                <SafeImage
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="280px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="h-20 bg-white/5" />
            )}
            <div className="p-2.5 flex flex-col flex-1">
              <div className="flex items-center gap-1 text-[10px] text-slate-muted">
                <Calendar size={11} />
                {new Date(post.createdAt).toLocaleDateString("vi-VN")}
              </div>
              <h3 className="font-display text-sm font-semibold text-white mt-1 line-clamp-2 leading-snug group-hover:text-sky-light transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="text-[11px] text-slate-muted line-clamp-2 mt-1 flex-1">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="public-link text-[10px] mt-2 inline-flex items-center gap-0.5">
                Đọc thêm <ArrowRight size={12} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

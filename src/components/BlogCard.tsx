import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { SafeImage } from "./SafeImage";
import type { BlogPost } from "@/lib/types";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="group public-card overflow-hidden p-0 hover:shadow-xl hover:shadow-sky/5">
      {post.coverImage && (
        <div className="relative h-48 overflow-hidden bg-navy-light">
          <SafeImage
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 text-xs text-slate-muted mb-3">
          <Calendar size={14} />
          {new Date(post.createdAt).toLocaleDateString("vi-VN")}
        </div>
        <h3 className="font-display text-xl font-semibold mb-2 text-white group-hover:text-sky-light transition-colors">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="text-slate-muted text-sm line-clamp-2 mb-4">{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="public-link inline-flex items-center gap-1 hover:gap-2">
          Đọc thêm <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

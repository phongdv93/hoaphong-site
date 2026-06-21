import { SafeImage } from "@/components/SafeImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar } from "lucide-react";
import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { getPostBySlug } from "@/lib/data";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy" };
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <PublicPageLayout>
      <Link href="/blog" className="public-link inline-flex items-center gap-1 text-xs mb-4 -mt-1">
        <ArrowLeft size={14} /> Danh sách bài viết
      </Link>

      <article className="max-w-3xl">
        <div className="flex items-center gap-2 text-[11px] text-slate-muted mb-2">
          <Calendar size={12} />
          {new Date(post.createdAt).toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-white leading-tight">{post.title}</h1>
        {post.excerpt && <p className="mt-2 text-sm text-slate-muted">{post.excerpt}</p>}

        {post.coverImage && (
          <div className="relative aspect-[2/1] max-h-56 rounded-xl overflow-hidden border border-white/10 mt-4">
            <SafeImage
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="prose-public mt-5 text-sm">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>
    </PublicPageLayout>
  );
}

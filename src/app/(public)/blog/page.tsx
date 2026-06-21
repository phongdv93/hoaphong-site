import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { BlogList } from "@/components/public/BlogList";
import { getPublishedPosts } from "@/lib/data";

export const metadata = { title: "Blog" };

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <PublicPageLayout>
      <BlogList posts={posts} />
    </PublicPageLayout>
  );
}

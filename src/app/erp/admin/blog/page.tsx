import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export default function AdminBlogPage() {
  return (
    <AdminShell title="Blog website">
      <p className="text-sm text-slate-400 mb-6">
        Bài viết tin tức / kiến thức trên website công khai.
      </p>
      <CrudManager
        apiPath="/api/blog"
        title="bài viết"
        defaultItem={{
          title: "",
          slug: "",
          excerpt: "",
          content: "",
          coverImage: "",
          published: true,
        }}
        fields={[
          { key: "title", label: "Tiêu đề" },
          { key: "slug", label: "Slug (để trống = tự tạo)" },
          { key: "excerpt", label: "Tóm tắt", type: "textarea", rows: 2 },
          { key: "content", label: "Nội dung (Markdown)", type: "textarea", rows: 8 },
          { key: "coverImage", label: "URL ảnh bìa" },
          { key: "published", label: "Xuất bản", type: "checkbox" },
        ]}
      />
    </AdminShell>
  );
}

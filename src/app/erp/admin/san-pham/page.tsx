import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export default function AdminProductsPage() {
  return (
    <AdminShell title="Quản lý Sản phẩm">
      <CrudManager
        apiPath="/api/products"
        title="sản phẩm"
        defaultItem={{
          name: "",
          slug: "",
          description: "",
          price: "Liên hệ",
          image: "",
          category: "Khác",
          featured: false,
          published: true,
          sortOrder: 0,
        }}
        fields={[
          { key: "name", label: "Tên sản phẩm" },
          { key: "slug", label: "Slug" },
          { key: "description", label: "Mô tả", type: "textarea", rows: 3 },
          { key: "price", label: "Giá" },
          { key: "image", label: "URL ảnh" },
          { key: "category", label: "Danh mục" },
          { key: "sortOrder", label: "Thứ tự", type: "number" },
          { key: "featured", label: "Nổi bật", type: "checkbox" },
          { key: "published", label: "Hiển thị", type: "checkbox" },
        ]}
      />
    </AdminShell>
  );
}

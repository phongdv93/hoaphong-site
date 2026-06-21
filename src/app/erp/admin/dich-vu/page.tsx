import { AdminShell } from "@/components/admin/AdminShell";
import { CrudManager } from "@/components/admin/CrudManager";

export default function AdminServicesPage() {
  return (
    <AdminShell title="Quản lý Dịch vụ">
      <CrudManager
        apiPath="/api/services"
        title="dịch vụ"
        defaultItem={{
          name: "",
          slug: "",
          description: "",
          icon: "sparkles",
          features: '["Tính năng 1","Tính năng 2"]',
          published: true,
          sortOrder: 0,
        }}
        fields={[
          { key: "name", label: "Tên dịch vụ" },
          { key: "slug", label: "Slug" },
          { key: "description", label: "Mô tả", type: "textarea", rows: 3 },
          { key: "icon", label: "Icon (sofa, paintbrush, building, package, zap, pen-tool, code)" },
          { key: "features", label: "Tính năng (JSON array)", type: "textarea", rows: 3 },
          { key: "sortOrder", label: "Thứ tự", type: "number" },
          { key: "published", label: "Hiển thị", type: "checkbox" },
        ]}
      />
    </AdminShell>
  );
}

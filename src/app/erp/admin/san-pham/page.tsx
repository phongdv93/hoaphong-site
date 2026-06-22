import { AdminShell } from "@/components/admin/AdminShell";
import { WebsiteProductsPanel } from "@/components/admin/WebsiteProductsPanel";

export default function AdminProductsPage() {
  return (
    <AdminShell title="Sản phẩm website">
      <WebsiteProductsPanel />
    </AdminShell>
  );
}

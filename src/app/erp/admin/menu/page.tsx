import { AdminShell } from "@/components/admin/AdminShell";
import { MenuManager } from "@/components/admin/MenuManager";

export default function AdminMenuPage() {
  return (
    <AdminShell title="Menu website">
      <MenuManager />
    </AdminShell>
  );
}

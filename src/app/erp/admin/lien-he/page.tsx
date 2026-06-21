import { AdminShell } from "@/components/admin/AdminShell";
import { ContactsManager } from "@/components/admin/ContactsManager";

export default function AdminContactsPage() {
  return (
    <AdminShell title="Yêu cầu liên hệ">
      <ContactsManager />
    </AdminShell>
  );
}

import { AdminShell } from "@/components/admin/AdminShell";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Cài đặt website">
      <SettingsForm />
    </AdminShell>
  );
}

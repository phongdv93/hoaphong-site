import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { PermissionsClient } from "@/components/quan-tri/PermissionsClient";

export default function QuanTriPhanQuyenPage() {
  return (
    <ErpShell title="Quản trị · Phân quyền" groupId="quan-tri">
      <ModuleAccessGuard moduleId="quan-tri">
        <PermissionsClient />
      </ModuleAccessGuard>
    </ErpShell>
  );
}

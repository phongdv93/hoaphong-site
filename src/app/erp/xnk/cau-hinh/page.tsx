import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { VnaccsProfileForm } from "@/components/customs/VnaccsProfileForm";

export default function VnaccsConfigPage() {
  return (
    <ErpShell title="Kết nối hải quan" groupId="xnk">
      <ModuleAccessGuard moduleId="xnk">
        <div className="p-4">
          <VnaccsProfileForm />
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}

import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { CustomsMasterDataManager } from "@/components/customs/CustomsMasterDataManager";

export default function CustomsMasterDataPage() {
  return (
    <ErpShell title="Danh mục mã hải quan" groupId="xnk">
      <ModuleAccessGuard moduleId="xnk">
        <div className="p-4">
          <CustomsMasterDataManager />
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}


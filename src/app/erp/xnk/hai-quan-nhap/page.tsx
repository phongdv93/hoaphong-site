import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { ImportDeclarationsClient } from "@/components/customs/ImportDeclarationsClient";

export default function HaiQuanNhapPage() {
  return (
    <ErpShell title="Khai báo nhập khẩu" groupId="xnk">
      <ModuleAccessGuard moduleId="xnk">
        <div className="p-4">
          <ImportDeclarationsClient />
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}

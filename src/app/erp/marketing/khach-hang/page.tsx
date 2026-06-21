import { ErpShell } from "@/components/erp/ErpShell";
import { CustomerManager } from "@/components/marketing/CustomerManager";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { getDepartmentName } from "@/lib/erp/departments";

export default function KhachHangPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);

  return (
    <ErpShell title="Khách hàng" groupId="marketing">
      <p className="text-midnight/60 text-sm mb-4 max-w-2xl">
        Module Marketing — quản lý thông tin khách hàng. Phân quyền theo phòng ban (
        {getDepartmentName("marketing")}) sẽ bổ sung sau.
      </p>
      {!hasDb ? <DbSetupBanner /> : <CustomerManager />}
    </ErpShell>
  );
}

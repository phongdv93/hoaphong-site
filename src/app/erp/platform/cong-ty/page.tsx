import { redirect } from "next/navigation";
import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { requirePlatformAdmin } from "@/lib/platform/guard";
import { PlatformCompanyList } from "@/components/platform/PlatformCompanyList";

export default async function PlatformCongTyPage() {
  const adminId = await requirePlatformAdmin();
  if (!adminId) redirect("/erp");
  const hasDb = Boolean(process.env.DATABASE_URL);

  return (
    <ErpShell title="Công ty & gói module">
      <p className="text-slate-400 text-sm mb-4 max-w-3xl">
        Dành cho <span className="font-semibold text-slate-200">Hoa Phong (Platform)</span>.
        Chọn công ty → bật/tắt từng module ERP, đặt ngày hiệu lực và phí thuê. Công ty chỉ thấy
        menu đã được mở.
      </p>
      {!hasDb ? <DbSetupBanner /> : <PlatformCompanyList />}
    </ErpShell>
  );
}

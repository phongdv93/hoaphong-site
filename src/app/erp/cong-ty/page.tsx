import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { CompanyList } from "@/components/projects/CompanyList";

export default function CongTyPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  return (
    <ErpShell title="Công ty">
      <p className="text-midnight/60 text-sm mb-4 max-w-2xl">
        Mỗi công ty là một không gian dữ liệu riêng. Bạn có thể thuộc về nhiều công ty và
        chuyển qua lại bằng menu Công ty trên thanh điều hướng.
      </p>
      {!hasDb ? <DbSetupBanner /> : <CompanyList />}
    </ErpShell>
  );
}

import { ErpShell } from "@/components/erp/ErpShell";
import { ErpQuoteBuilder } from "@/components/quote/ErpQuoteBuilder";

export const metadata = {
  title: "Báo giá mới | ERP",
};

export default function ErpBaoGiaTaoMoiPage() {
  return (
    <ErpShell title="Báo giá mới" groupId="marketing" fillHeight contentBleed>
      <div className="flex-1 min-h-0 px-4 pb-4">
        <ErpQuoteBuilder mode="new" />
      </div>
    </ErpShell>
  );
}

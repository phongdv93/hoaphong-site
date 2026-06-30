import { ErpShell } from "@/components/erp/ErpShell";
import { QuoteListClient } from "@/components/quote/QuoteListClient";

export const metadata = {
  title: "Báo giá | ERP",
};

export default function ErpBaoGiaPage() {
  return (
    <ErpShell title="Báo giá" groupId="marketing" fillHeight contentBleed>
      <QuoteListClient />
    </ErpShell>
  );
}

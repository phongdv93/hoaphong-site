import { ErpShell } from "@/components/erp/ErpShell";
import { ErpQuoteBuilder } from "@/components/quote/ErpQuoteBuilder";

export const metadata = {
  title: "Sửa báo giá | ERP",
};

type Props = { params: Promise<{ id: string }> };

export default async function ErpBaoGiaEditPage({ params }: Props) {
  const { id } = await params;
  return (
    <ErpShell title="Báo giá" groupId="marketing" fillHeight contentBleed>
      <div className="flex-1 min-h-0 px-4 pb-4">
        <ErpQuoteBuilder quoteId={Number(id)} />
      </div>
    </ErpShell>
  );
}

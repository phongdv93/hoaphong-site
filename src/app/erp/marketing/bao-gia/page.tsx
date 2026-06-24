import { ErpShell } from "@/components/erp/ErpShell";
import { ErpQuoteBuilder } from "@/components/quote/ErpQuoteBuilder";

export const metadata = {
  title: "Báo giá | ERP",
};

export default function ErpBaoGiaPage() {
  return (
    <ErpShell title="Báo giá" groupId="marketing" fillHeight contentBleed>
      <p className="text-midnight/60 text-sm mb-3 max-w-3xl shrink-0 px-4 pt-4">
        Luồng bán hàng: <strong>Báo giá</strong> → Lưu danh mục SP → Khách đặt hàng → Thêm SP vào
        dự án → Đặt NCC → Theo dõi tiến độ.
      </p>
      <div className="flex-1 min-h-0 px-4 pb-4">
        <ErpQuoteBuilder />
      </div>
    </ErpShell>
  );
}

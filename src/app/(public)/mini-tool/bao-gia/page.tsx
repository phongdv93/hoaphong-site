import Link from "next/link";
import { QuoteBuilder } from "@/components/quote/QuoteBuilder";
import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Mini tool báo giá",
  description:
    "Công cụ miễn phí cho khách vãng lai: tạo báo giá, thêm logo, bảng linh hoạt và tải PDF.",
};

export default async function MiniToolBaoGiaPage() {
  const settings = await getSettings();

  return (
    <PublicPageLayout
      fillViewport
      toolbar={
        <p className="text-sm text-slate-muted max-w-3xl">
          Mini tool dành cho khách vãng lai — không cần đăng nhập. Dữ liệu lưu trên trình duyệt của
          bạn. Nhân viên công ty dùng{" "}
          <Link href="/erp/marketing/bao-gia" className="text-sky hover:underline">
            Báo giá ERP
          </Link>{" "}
          để lưu danh mục sản phẩm và theo luồng bán hàng.
        </p>
      }
    >
      <QuoteBuilder
        variant="mini"
        defaultSeller={{
          company: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
        }}
      />
    </PublicPageLayout>
  );
}

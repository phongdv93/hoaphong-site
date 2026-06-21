import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { AboutSections } from "@/components/public/AboutSections";
import { getSettings } from "@/lib/settings";
import { STOCK_IMAGES } from "@/lib/images";

export const metadata = { title: "Về chúng tôi" };

const milestones = [
  {
    id: "khoi-dau",
    iconKey: "hammer",
    year: "Khởi đầu",
    title: "Sản xuất & thi công nội thất",
    desc: "Xưởng gia công tủ bếp, vách ngăn, nội thất — là nền tảng tay nghề và uy tín của Hoa Phong. Đội ngũ thợ có kinh nghiệm trực tiếp tại xưởng, kiểm soát từng chi tiết đường cắt, lắp ráp và hoàn thiện bề mặt trước khi bàn giao công trình.",
  },
  {
    id: "mo-rong",
    iconKey: "building",
    year: "Mở rộng",
    title: "Cải tạo, trang trí & xây dựng",
    desc: "Phục vụ nhà ở, văn phòng, công trình thương mại — trọn gói từ thô đến hoàn thiện. Hoa Phong phối hợp kiến trúc, MEP và thi công nội thất trong một luồng quản lý, giảm rủi ro chênh lệch bản vẽ và tiến độ.",
  },
  {
    id: "phat-trien",
    iconKey: "package",
    year: "Phát triển",
    title: "Đấu thầu & cung ứng vật tư",
    desc: "Vật liệu xây dựng, thiết bị điện, hàng hóa công trình — đúng hồ sơ, đúng tiến độ. Chúng tôi có nguồn cung đa kênh, chứng từ rõ ràng và khả năng đáp ứng đơn hàng lớn cho dự án B2B, nhà máy và chủ đầu tư.",
  },
  {
    id: "hien-tai",
    iconKey: "code",
    year: "Hiện tại",
    title: "Thiết kế giải pháp & phần mềm",
    desc: "Mạng thiết kế kỹ thuật và giải pháp số — quản lý dự án, báo giá, kho vật tư, kho gỗ. ERP nội bộ giúp đồng bộ sản xuất – kho – marketing, hướng tới vận hành minh bạch và mở rộng quy mô bền vững.",
  },
];

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <PublicPageLayout fillViewport>
      <AboutSections
        imageSrc={STOCK_IMAGES.interior}
        imageAlt="Nội thất Hoa Phong"
        aboutContent={settings.aboutContent}
        address={settings.address}
        email={settings.email}
        phone={settings.phone}
        milestones={milestones}
      />
    </PublicPageLayout>
  );
}

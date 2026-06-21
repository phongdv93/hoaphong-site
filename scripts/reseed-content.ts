/**
 * Cập nhật toàn bộ nội dung website theo lĩnh vực thực tế Hoa Phong.
 * Chạy: npm run db:reseed
 */
import { initDb, execute, slugify } from "../src/lib/db";
import { STOCK_IMAGES } from "../src/lib/images";
import { saveSettings } from "../src/lib/settings";
import type { SiteSettings } from "../src/lib/types";

const I = STOCK_IMAGES;

const siteSettings: Partial<SiteSettings> = {
  companyName: "Hoa Phong",
  tagline: "Từ không gian sống đến giải pháp số — Trọn gói, bền vững",
  description:
    "Hoa Phong — đơn vị sản xuất thi công nội thất, cải tạo trang trí, xây dựng, cung ứng vật tư thiết bị đấu thầu và phát triển giải pháp thiết kế & phần mềm tại Việt Nam.",
  heroTitle: "Kiến tạo không gian — Nâng tầm công trình",
  heroSubtitle:
    "Hơn một thập kỷ đồng hành: từ nội thất, xây dựng, cung ứng vật tư đến thiết kế giải pháp và phần mềm quản lý dự án.",
  aboutTitle: "Hành trình Hoa Phong",
  aboutContent: `Hoa Phong khởi nguồn từ sản xuất và thi công nội thất — chúng tôi hiểu từng đường cắt, từng đường chỉ và từng chi tiết hoàn thiện.

Theo thời gian, chúng tôi mở rộng sang cải tạo, trang trí nhà cửa và thi công xây dựng, mang đến giải pháp trọn gói cho gia đình và doanh nghiệp.

Giai đoạn tiếp theo, Hoa Phong tham gia đấu thầu, cung cấp thiết bị, hàng hóa, vật liệu xây dựng và thiết bị điện cho các dự án quy mô lớn — cam kết nguồn gốc rõ ràng, tiến độ chuẩn hợp đồng.

Hiện nay, chúng tôi bổ sung mảng mạng thiết kế giải pháp kỹ thuật và phát triển phần mềm — giúp khách hàng quản lý dự án, báo giá và vận hành hiệu quả hơn trên nền tảng số.

Một đối tác — nhiều lớp giá trị. Đó là lời hứa của Hoa Phong.`,
};

const blogPosts = [
  {
    title: "Xu hướng nội thất 2026: Tối giản có chiều sâu",
    excerpt:
      "Không gian sống hiện đại ưu tiên vật liệu tự nhiên, ánh sáng layers và nội thất đa chức năng — phù hợp nhà phố và căn hộ Việt Nam.",
    content: `## Không gian sống thông minh hơn

Năm 2026, xu hướng nội thất tại Việt Nam hướng tới **tối giản có chiều sâu**: ít đồ nhưng chất lượng cao, tối ưu diện tích và dễ bảo trì.

### Vật liệu được ưa chuộng

- Gỗ công nghiệp phủ melamine chống ẩm
- Đá nhân tạo cho bàn bếp, vách trang trí
- Kính mờ phân tách không gian mà vẫn đón sáng

### Gợi ý từ Hoa Phong

Với kinh nghiệm sản xuất thi công nội thất, chúng tôi tư vấn phương án **tủ bếp, vách ngăn, nội thất phòng ngủ** theo đúng kích thước thực tế công trình — hạn chế phát sinh khi lắp đặt.

> Liên hệ Hoa Phong để khảo sát miễn phí và nhận bản vẽ 3D sơ bộ.`,
    cover: I.interior,
  },
  {
    title: "5 bước cải tạo nhà cũ an toàn, đúng tiến độ",
    excerpt:
      "Cải tạo không chỉ là “làm đẹp” — cần khảo sát kết cấu, thủ tục và kế hoạch vật tư rõ ràng trước khi thi công.",
    content: `## Cải tạo thành công bắt đầu từ khảo sát

Hoa Phong triển khai hàng trăm hạng mục cải tạo nhà ở, văn phòng và mặt bằng kinh doanh. Quy trình chuẩn gồm:

1. **Khảo sát hiện trạng** — ẩm mốc, điện nước, kết cấu
2. **Thiết kế & dự toán** — minh bạch hạng mục, tránh phát sinh
3. **Thi công theo giai đoạn** — điện nước → trát → hoàn thiện
4. **Nghiệm thu từng hạng mục** — có biên bản ký xác nhận
5. **Bảo hành có thời hạn** — hỗ trợ sau bàn giao

### Lưu ý pháp lý

Một số hạng mục cải tạo cần thông báo hoặc giấy phép — đội ngũ Hoa Phong hỗ trợ tư vấn sơ bộ để chủ đầu tư an tâm.`,
    cover: I.decor,
  },
  {
    title: "Quản lý vật tư xây dựng trong đấu thầu: Sai sót thường gặp",
    excerpt:
      "Chậm tiến độ, vượt ngân sách thường xuất phát từ BOQ không khớp thực tế và nguồn cung không ổn định.",
    content: `## Đấu thầu cần dữ liệu chính xác

Hoa Phong có kinh nghiệm **cung cấp vật liệu xây dựng, thiết bị điện và hàng hóa công trình** theo hồ sơ mời thầu.

### Ba sai sót phổ biến

- **BOQ mơ hồ** — thiếu quy cách, thương hiệu hoặc đơn vị đo
- **Chào giá cắt cổt** — khó đảm bảo chất lượng và tiến độ
- **Logistics yếu** — giao chậm, ảnh hưởng tiến độ thi công

### Giải pháp Hoa Phong

- Bóc tách khối lượng độc lập khi cần
- Nguồn hàng đa nhà cung cấp, chứng từ đầy đủ
- Giao hàng theo tiến độ công trình

Liên hệ để nhận catalogue vật tư và thiết bị điện cập nhật.`,
    cover: I.materials,
  },
  {
    title: "Thiết bị điện công trình: Chọn đúng để an toàn lâu dài",
    excerpt:
      "Tủ điện, cáp và thiết bị bảo vệ cần đúng tiêu chuẩn — đặc biệt với nhà xưởng, tòa nhà văn phòng và dự án dân dụng.",
    content: `## Điện công trình — không được “làm tạm”

Hoa Phong cung ứng **thiết bị điện, tủ phân phối, cáp điện và phụ kiện** cho thầu phụ và chủ đầu tư.

### Tiêu chí lựa chọn

| Hạng mục | Gợi ý |
|----------|--------|
| Tủ điện | IP phù hợp môi trường, có sơ đồ rõ ràng |
| Cáp điện | Đúng tiết diện, nguồn gốc CO/CQ |
| Thiết bị bảo vệ | Aptomat, RCCB đạt chuẩn |

Chúng tôi phối hợp bản vẽ shop drawing khi khách hàng cần tích hợp với hệ thống MEP công trình.`,
    cover: I.electrical,
  },
  {
    title: "Từ xây dựng truyền thống đến quản lý dự án bằng phần mềm",
    excerpt:
      "Hoa Phong mở rộng mảng phần mềm — giúp doanh nghiệp xây dựng & nội thất theo dõi tiến độ, kho vật tư và báo giá trên một nền tảng.",
    content: `## Chuyển đổi số cho ngành xây dựng

Sau nhiều năm thi công và cung ứng, chúng tôi nhận thấy **quản lý bằng Excel** không còn đủ khi dự án nhân lên.

### Phần mềm Hoa Phong hướng tới

- **Báo giá & BOQ** — mẫu hạng mục nội thất, xây dựng
- **Theo dõi tiến độ** — Gantt, cảnh báo chậm hạng mục
- **Kho vật tư** — nhập xuất theo công trình
- **Hồ sơ nghiệm thu** — lưu trữ ảnh, biên bản

### Lộ trình triển khai

1. Khảo sát quy trình hiện tại (1–2 tuần)
2. Cấu hình phần mềm theo mô hình công ty
3. Đào tạo nhân sự và hỗ trợ 3 tháng đầu

Đây là bước tiến tự nhiên trong hành trình Hoa Phong — từ tay nghề đến công nghệ.`,
    cover: I.business,
  },
  {
    title: "Thiết kế giải pháp kỹ thuật: Khi ý tưởng cần bản vẽ chuẩn",
    excerpt:
      "Mạng thiết kế giải pháp Hoa Phong kết nối kiến trúc, kết cấu, MEP và nội thất — rút ngắn vòng lặp chỉnh sửa.",
    content: `## Thiết kế không chỉ là “đẹp”

Trước khi thi công, **bản vẽ kỹ thuật đúng** giúp giảm 30–40% phát sinh trên công trường.

### Dịch vụ thiết kế giải pháp

- Layout mặt bằng nội thất & phân khu chức năng
- Shop drawing tủ bếp, vách, trần
- Phối hợp MEP — điện, nước, điều hòa
- Hồ sơ thi công và as-built

Hoa Phong có đội ngũ và đối tác thiết kế trong mạng lưới — sẵn sàng đồng hành từ concept đến bàn giao.`,
    cover: I.construction,
  },
  {
    title: "Trang trí nhà cửa theo phong cách: Bí quyết cân bằng ngân sách",
    excerpt:
      "Trang trí không nhất thiết tốn kém — chọn điểm nhấn đúng chỗ và phối màu hài hòa tạo nên không gian riêng.",
    content: `## Trang trí thông minh

Đội **trang trí nhà cửa** Hoa Phong giúp khách hàng:

- Chọn sơn, giấy dán tường, rèm cửa phù hợp ánh sáng tự nhiên
- Bố trí đồ decor, tranh, đèn không làm rối không gian
- Phối màu theo nhận diện thương hiệu (văn phòng, showroom)

### Gói dịch vụ gợi ý

| Gói | Phù hợp |
|-----|---------|
| Cơ bản | Căn hộ 1–2 phòng, refresh nhẹ |
| Tiêu chuẩn | Nhà phố, cải tạo toàn diện |
| Premium | Biệt thự, khách sạn mini |

Liên hệ để book lịch tư vấn tại nhà.`,
    cover: I.decor,
  },
  {
    title: "Case study: Cải tạo văn phòng 400m² — 45 ngày bàn giao",
    excerpt:
      "Dự án thực tế: tháo dỡ, thi công mới, nội thất và hệ thống điện — đúng tiến độ cho doanh nghiệp logistics.",
    content: `## Bối cảnh dự án

Khách hàng cần **cải tạo văn phòng 400m²** tại TP.HCM: mở không gian làm việc chung, phòng họp và khu tiếp khách.

### Phạm vi Hoa Phong đảm nhận

- Tháo dỡ, xử lý thạch cao cũ
- Thi công vách kính, trần, sàn
- Sản xuất & lắp nội thất văn phòng
- Cung ứng thiết bị điện, đèn LED

### Kết quả

- Bàn giao sau **45 ngày** làm việc
- Nghiệm thu đủ hồ sơ ảnh và biên bản
- Khách hàng mở rộng hợp đồng bảo trì định kỳ

> Đây là minh chứng cho mô hình trọn gói: xây dựng — nội thất — vật tư — một đầu mối.`,
    cover: I.office,
  },
];

const services = [
  {
    name: "Sản xuất & Thi công nội thất",
    icon: "sofa",
    desc: "Xưởng sản xuất tủ bếp, vách ngăn, nội thất văn phòng và gia đình — thi công trọn gói, bảo hành rõ ràng.",
    features: [
      "Tủ bếp, tủ áo theo đo",
      "Vách ngăn, lam sóng trang trí",
      "Nội thất văn phòng, showroom",
      "Gia công inox, kính, đá",
    ],
  },
  {
    name: "Cải tạo & Trang trí nhà cửa",
    icon: "paintbrush",
    desc: "Cải tạo nhà ở, căn hộ, mặt bằng kinh doanh — từ thiết kế ý tưởng đến hoàn thiện và trang trí.",
    features: [
      "Khảo sát & tư vấn miễn phí",
      "Sơn, wallpaper, rèm cửa",
      "Cải tạo điện nước, trát, lát",
      "Styling & decor theo phong cách",
    ],
  },
  {
    name: "Thi công xây dựng",
    icon: "building",
    desc: "Thi công phần thô, hoàn thiện, nhà xưởng và công trình dân dụng — đội ngũ giàu kinh nghiệm công trường.",
    features: [
      "Nhà phố, biệt thự, căn hộ",
      "Công trình thương mại",
      "Nhà xưởng, kho bãi",
      "Giám sát & nghiệm thu",
    ],
  },
  {
    name: "Đấu thầu & Cung ứng vật tư",
    icon: "package",
    desc: "Cung cấp vật liệu xây dựng, thiết bị, hàng hóa công trình theo hồ sơ đấu thầu — đúng quy cách, đúng hạn.",
    features: [
      "Xi măng, thép, gạch, cát",
      "Thiết bị vệ sinh, ống nước",
      "Hồ sơ CO/CQ, hóa đơn VAT",
      "Giao hàng theo tiến độ",
    ],
  },
  {
    name: "Thiết bị điện công trình",
    icon: "zap",
    desc: "Tủ điện, cáp điện, aptomat, chiếu sáng công nghiệp — phục vụ thầu MEP và chủ đầu tư.",
    features: [
      "Tủ phân phối, tủ điều khiển",
      "Cáp điện các loại",
      "Đèn LED công nghiệp",
      "Phụ kiện & lắp đặt",
    ],
  },
  {
    name: "Thiết kế giải pháp kỹ thuật",
    icon: "pen-tool",
    desc: "Mạng thiết kế nội bộ và đối tác — bản vẽ shop drawing, phối hợp kiến trúc & MEP.",
    features: [
      "Layout & concept nội thất",
      "Shop drawing thi công",
      "Phối hợp MEP",
      "Hồ sơ as-built",
    ],
  },
  {
    name: "Phát triển phần mềm & Giải pháp số",
    icon: "code",
    desc: "Phần mềm quản lý dự án, báo giá BOQ, kho vật tư — dành cho doanh nghiệp xây dựng và nội thất.",
    features: [
      "Quản lý dự án & tiến độ",
      "Báo giá, BOQ tự động",
      "Kho vật tư đa công trình",
      "Tùy biến theo quy trình",
    ],
  },
];

const products = [
  {
    name: "Tủ bếp Acrylic cao cấp",
    category: "Nội thất",
    price: "Từ 18.000.000đ/bộ",
    desc: "Tủ bếp gỗ MFC phủ Acrylic chống ẩm, phụ kiện Blum, thiết kế theo kích thước thực tế.",
    image: I.kitchen,
    featured: 1,
  },
  {
    name: "Vách ngăn phòng khách kính + gỗ",
    category: "Nội thất",
    price: "Từ 8.500.000đ",
    desc: "Vách ngăn nhẹ, tối ưu ánh sáng, phù hợp căn hộ và nhà phố hiện đại.",
    image: I.interior,
    featured: 1,
  },
  {
    name: "Nội thất văn phòng trọn gói",
    category: "Nội thất",
    price: "Liên hệ báo giá",
    desc: "Bàn làm việc, tủ hồ sơ, quầy lễ tân — thiết kế theo nhận diện thương hiệu.",
    image: I.office,
    featured: 1,
  },
  {
    name: "Xi măng PC40 — Giao công trình",
    category: "Vật liệu xây dựng",
    price: "Theo khối lượng đấu thầu",
    desc: "Cung ứng xi măng bao, giao đúng tiến độ, đủ chứng từ nguồn gốc.",
    image: I.materials,
    featured: 0,
  },
  {
    name: "Thép xây dựng các loại",
    category: "Vật liệu xây dựng",
    price: "Liên hệ",
    desc: "Thép than, thép cuộn — cắt bó theo bản vẽ, phục vụ dự án dân dụng và công nghiệp.",
    image: I.construction,
    featured: 0,
  },
  {
    name: "Gạch ốp lát & đá ốp tường",
    category: "Vật liệu xây dựng",
    price: "Liên hệ",
    desc: "Đa dạng quy cách, mẫu mã — tư vấn lựa chọn theo hạng mục và ngân sách.",
    image: I.tiles,
    featured: 0,
  },
  {
    name: "Tủ điện phân phối MSB",
    category: "Thiết bị điện",
    price: "Từ 12.000.000đ",
    desc: "Tủ điện đóng sẵn hoặc theo bản vẽ, aptomat, busbar — đạt tiêu chuẩn công trình.",
    image: I.electrical,
    featured: 0,
  },
  {
    name: "Cáp điện Cadivi / LS",
    category: "Thiết bị điện",
    price: "Theo mét / cuộn",
    desc: "Cáp CV, CXV các tiết diện — hàng chính hãng, giao công trình.",
    image: I.cable,
    featured: 0,
  },
  {
    name: "Đèn LED panel công trình",
    category: "Thiết bị điện",
    price: "Từ 180.000đ/bộ",
    desc: "Chiếu sáng văn phòng, nhà xưởng — tiết kiệm điện, tuổi thọ cao.",
    image: I.office,
    featured: 0,
  },
  {
    name: "Hoa Phong Project — Quản lý dự án",
    category: "Phần mềm",
    price: "Liên hệ demo",
    desc: "Theo dõi tiến độ, hạng mục, chi phí và hồ sơ nghiệm thu — dành cho công ty xây dựng & nội thất.",
    image: I.software,
    featured: 1,
  },
  {
    name: "Hoa Phong Quote — Báo giá BOQ",
    category: "Phần mềm",
    price: "Liên hệ",
    desc: "Thư viện đơn giá nội thất, xây dựng — xuất báo giá PDF chuyên nghiệp trong vài phút.",
    image: I.chart,
    featured: 0,
  },
  {
    name: "Hoa Phong Stock — Kho vật tư",
    category: "Phần mềm",
    price: "Liên hệ",
    desc: "Quản lý nhập xuất vật tư theo từng công trình, cảnh báo tồn kho thấp.",
    image: I.warehouse,
    featured: 0,
  },
];

async function reseed() {
  await initDb();
  console.log("🔄 Đang cập nhật nội dung Hoa Phong...\n");

  await saveSettings(siteSettings);
  console.log("✓ Cài đặt website");

  await execute("DELETE FROM blog_posts");
  await execute("DELETE FROM products");
  await execute("DELETE FROM services");

  for (const p of blogPosts) {
    await execute(
      `INSERT INTO blog_posts (slug, title, excerpt, content, cover_image, published)
       VALUES ($1,$2,$3,$4,$5,1)`,
      [slugify(p.title), p.title, p.excerpt, p.content, p.cover]
    );
  }
  console.log(`✓ ${blogPosts.length} bài blog`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await execute(
      `INSERT INTO products (slug, name, description, price, image, category, featured, published, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8)`,
      [slugify(p.name), p.name, p.desc, p.price, p.image, p.category, p.featured, i]
    );
  }
  console.log(`✓ ${products.length} sản phẩm/hạng mục`);

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    await execute(
      `INSERT INTO services (slug, name, description, icon, features, published, sort_order)
       VALUES ($1,$2,$3,$4,$5,1,$6)`,
      [slugify(s.name), s.name, s.desc, s.icon, JSON.stringify(s.features), i]
    );
  }
  console.log(`✓ ${services.length} dịch vụ`);

  console.log("\n🌸 Hoàn tất! Refresh trang web để xem nội dung mới.");
}

reseed().catch((e) => {
  console.error(e);
  process.exit(1);
});

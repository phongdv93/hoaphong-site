import bcrypt from "bcryptjs";
import { initDb, query, queryOne, execute, slugify } from "../src/lib/db";
import { saveSettings } from "../src/lib/settings";
import { seedDepartments, seedDemoCustomers } from "../src/lib/erp/seed-departments";
import { seedInventoryHardwareDemo } from "../src/lib/inventory/items";

async function seed() {
  await initDb();

  const email = process.env.ADMIN_EMAIL || "admin@hoaphong.vn";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const legacyAdminEmail = "admin@hoaphong.vn";

  const existing = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = $1", [email]);
  if (!existing) {
    const hash = await bcrypt.hash(password, 10);
    await execute(
      "INSERT INTO users (email, password_hash, name, is_platform_admin) VALUES ($1,$2,$3, TRUE)",
      [email, hash, "Quản trị viên Hoa Phong Premium"]
    );
    console.log(`✓ Hoa Phong Premium created: ${email} / ${password}`);
  } else {
    await execute("UPDATE users SET is_platform_admin = TRUE WHERE email = $1", [email]);
    console.log("✓ Admin đã có — đã gán Hoa Phong Premium (is_platform_admin)");
  }

  if (email !== legacyAdminEmail) {
    await execute(
      "UPDATE users SET is_platform_admin = FALSE WHERE LOWER(email) = LOWER($1)",
      [legacyAdminEmail]
    );
  }

  await saveSettings({});

  const blogCount = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM blog_posts");
  if ((blogCount?.c ?? 0) === 0) {
    const posts = [
      {
        title: "Xu hướng chuyển đổi số 2026 cho doanh nghiệp SME",
        excerpt: "Khám phá những xu hướng công nghệ giúp doanh nghiệp vừa và nhỏ tăng trưởng bền vững.",
        content:
          "## Chuyển đổi số không còn là lựa chọn\n\nTrong bối cảnh thị trường cạnh tranh gay gắt, các doanh nghiệp SME cần nhanh chóng số hóa quy trình vận hành.",
        cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
      },
      {
        title: "5 nguyên tắc xây dựng thương hiệu bền vững",
        excerpt: "Bí quyết xây dựng thương hiệu có chiều sâu và lan tỏa giá trị lâu dài.",
        content: "## Thương hiệu là lời hứa\n\nMột thương hiệu mạnh không chỉ là logo đẹp.",
        cover: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
      },
      {
        title: "Tối ưu hóa quy trình vận hành với công nghệ",
        excerpt: "Cách Hoa Phong giúp khách hàng giảm chi phí vận hành thông qua tự động hóa.",
        content: "## Hiệu quả bắt đầu từ quy trình\n\nPhân tích bottleneck và triển khai công cụ phù hợp.",
        cover: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
      },
    ];

    for (const p of posts) {
      await execute(
        "INSERT INTO blog_posts (slug, title, excerpt, content, cover_image, published) VALUES ($1,$2,$3,$4,$5,1)",
        [slugify(p.title), p.title, p.excerpt, p.content, p.cover]
      );
    }
    console.log(`✓ ${posts.length} blog posts seeded`);
  }

  const productCount = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM products");
  if ((productCount?.c ?? 0) === 0) {
    const products = [
      { name: "Hoa Phong ERP Suite", category: "Phần mềm", price: "Liên hệ", desc: "Hệ thống ERP tích hợp.", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80", featured: 1 },
      { name: "Cloud Connect Pro", category: "Hạ tầng", price: "Từ 5.000.000đ/tháng", desc: "Kết nối đám mây an toàn.", image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80", featured: 1 },
    ];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      await execute(
        `INSERT INTO products (slug, name, description, price, image, category, featured, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [slugify(p.name), p.name, p.desc, p.price, p.image, p.category, p.featured, i]
      );
    }
    console.log(`✓ ${products.length} products seeded`);
  }

  await seedDepartments();
  console.log("✓ Departments seeded");

  console.log("\n🌸 Seed platform xong. Tiếp theo chạy:");
  console.log("   npm run db:migrate-tenant-b   (tách tenant DB + copy dữ liệu cũ nếu có)");
  console.log("   npm run db:seed-wood          (sau migrate, cần đã có công ty + tenant DB)");
  console.log("\n   Website: http://localhost:3000 | ERP: http://localhost:3000/erp");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

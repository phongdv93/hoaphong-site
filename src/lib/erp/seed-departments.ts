import { execute, queryOne } from "@/lib/db";
import { ERP_DEPARTMENTS } from "@/lib/erp/departments";

export async function seedDepartments(): Promise<void> {
  for (const d of ERP_DEPARTMENTS) {
    await execute(
      `INSERT INTO departments (id, name, sort_order) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
      [d.id, d.name, d.sortOrder]
    );
  }
}

export async function seedDemoCustomers(): Promise<void> {
  const count = await queryOne<{ c: number }>("SELECT COUNT(*)::int AS c FROM customers");
  if ((count?.c ?? 0) > 0) return;

  const demos = [
    {
      code: "KH-0001",
      name: "Công ty TNHH Nội thất Minh An",
      type: "dai_ly",
      phone: "0901234567",
      contactPerson: "Chị Lan",
    },
    {
      code: "KH-0002",
      name: "Dự án Villa Đà Lạt",
      type: "du_an",
      phone: "0912345678",
      contactPerson: "Anh Tuấn",
    },
    {
      code: "KH-0003",
      name: "Khách lẻ — Nguyễn Văn A",
      type: "le",
      phone: "0923456789",
      contactPerson: "",
    },
  ];

  for (const c of demos) {
    await execute(
      `INSERT INTO customers (code, name, type, phone, contact_person, status)
       VALUES ($1,$2,$3,$4,$5,'active')`,
      [c.code, c.name, c.type, c.phone, c.contactPerson]
    );
  }
}

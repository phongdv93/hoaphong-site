import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import type { Customer, CustomerType } from "@/lib/marketing/customer-types";

export type { Customer, CustomerType } from "@/lib/marketing/customer-types";
export { CUSTOMER_TYPE_LABELS } from "@/lib/marketing/customer-types";

function mapRow(row: Record<string, unknown>): Customer {
  return {
    id: row.id as number,
    code: row.code as string,
    name: row.name as string,
    type: row.type as CustomerType,
    taxCode: row.tax_code as string,
    phone: row.phone as string,
    email: row.email as string,
    address: row.address as string,
    contactPerson: row.contact_person as string,
    contactPhone: row.contact_phone as string,
    notes: row.notes as string,
    status: row.status as Customer["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const rows = await tenantQuery("SELECT * FROM customers ORDER BY name");
  return rows.map(mapRow);
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const row = await tenantQueryOne("SELECT * FROM customers WHERE id = $1", [id]);
  return row ? mapRow(row) : null;
}

async function nextCustomerCode(): Promise<string> {
  const row = await tenantQueryOne<{ code: string }>(
    `SELECT code FROM customers WHERE code ~ '^KH-[0-9]+$' ORDER BY id DESC LIMIT 1`
  );
  if (!row?.code) return "KH-0001";
  const n = parseInt(row.code.replace("KH-", ""), 10);
  return `KH-${String(n + 1).padStart(4, "0")}`;
}

export async function createCustomer(
  input: Omit<Customer, "id" | "createdAt" | "updatedAt"> & { code?: string }
): Promise<number> {
  const code = input.code?.trim() || (await nextCustomerCode());
  const row = await tenantQueryOne<{ id: number }>(
    `INSERT INTO customers (code, name, type, tax_code, phone, email, address, contact_person, contact_phone, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      code,
      input.name,
      input.type,
      input.taxCode || "",
      input.phone || "",
      input.email || "",
      input.address || "",
      input.contactPerson || "",
      input.contactPhone || "",
      input.notes || "",
      input.status || "active",
    ]
  );
  return row!.id;
}

export async function updateCustomer(
  id: number,
  input: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const cur = await getCustomer(id);
  if (!cur) throw new Error("Không tìm thấy khách hàng");

  await tenantExecute(
    `UPDATE customers SET
      code=$1, name=$2, type=$3, tax_code=$4, phone=$5, email=$6, address=$7,
      contact_person=$8, contact_phone=$9, notes=$10, status=$11, updated_at=NOW()
     WHERE id=$12`,
    [
      input.code ?? cur.code,
      input.name ?? cur.name,
      input.type ?? cur.type,
      input.taxCode ?? cur.taxCode,
      input.phone ?? cur.phone,
      input.email ?? cur.email,
      input.address ?? cur.address,
      input.contactPerson ?? cur.contactPerson,
      input.contactPhone ?? cur.contactPhone,
      input.notes ?? cur.notes,
      input.status ?? cur.status,
      id,
    ]
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  await tenantExecute("DELETE FROM customers WHERE id = $1", [id]);
}

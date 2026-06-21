import { platformQueryOne } from "./platform";
import { tenantExecute } from "./tenant";

export async function syncTenantUser(companyId: number, userId: number): Promise<void> {
  const u = await platformQueryOne<{ id: number; name: string; email: string }>(
    `SELECT id, name, email FROM users WHERE id = $1`,
    [userId]
  );
  if (!u) return;
  await tenantExecute(
    `INSERT INTO erp_users (id, name, email, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = NOW()`,
    [u.id, u.name, u.email],
    companyId
  );
}

export async function syncTenantUsers(companyId: number, userIds: number[]): Promise<void> {
  for (const id of [...new Set(userIds)]) {
    await syncTenantUser(companyId, id);
  }
}

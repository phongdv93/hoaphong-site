import { tenantQuery } from "@/lib/db/tenant";
import { resolveSupplierForProduct } from "@/lib/suppliers/repository";
import type { PoSupplierSuggestion } from "@/lib/suppliers/types";
import {
  addPurchaseOrderLines,
  createPurchaseOrder,
} from "./repository";

export async function suggestProjectPurchaseOrders(
  companyId: number,
  projectId: number,
  createdBy?: number
): Promise<{ suggestions: PoSupplierSuggestion[]; created: number }> {
  const items = await tenantQuery<Record<string, unknown>>(
    `SELECT id, name, factory_product_id FROM project_items WHERE project_id = $1 ORDER BY sort_order, id`,
    [projectId],
    companyId
  );

  const groups = new Map<string, PoSupplierSuggestion>();

  for (const row of items) {
    const itemId = Number(row.id);
    const fpId = row.factory_product_id != null ? Number(row.factory_product_id) : null;
    let supplierId: number | null = null;
    let supplierName = "";
    const warnings: string[] = [];

    if (fpId) {
      const resolved = await resolveSupplierForProduct(companyId, fpId);
      if (resolved?.supplierId) {
        supplierId = resolved.supplierId;
        supplierName = resolved.supplierName;
      } else if (resolved?.supplierName) {
        supplierName = resolved.supplierName;
        warnings.push(`SP «${row.name}»: NCC «${supplierName}» chưa có trong danh mục`);
      } else {
        warnings.push(`SP «${row.name}»: chưa gán NCC`);
      }
    } else {
      warnings.push(`Hạng mục «${row.name}»: chưa liên kết sản phẩm danh mục`);
    }

    const key = supplierId != null ? `id:${supplierId}` : supplierName ? `name:${supplierName.toLowerCase()}` : "unknown";
    const label = supplierName || "Chưa xác định NCC";
    const cur = groups.get(key) ?? {
      supplierId,
      supplierName: label,
      projectItemIds: [],
      warnings: [],
    };
    cur.projectItemIds.push(itemId);
    cur.warnings.push(...warnings);
    groups.set(key, cur);
  }

  const suggestions = [...groups.values()].filter((g) => g.projectItemIds.length > 0);
  let created = 0;

  for (const group of suggestions) {
    if (!group.supplierName || group.supplierName === "Chưa xác định NCC") continue;
    const po = await createPurchaseOrder(
      companyId,
      projectId,
      { supplierName: group.supplierName, supplierId: group.supplierId },
      createdBy
    );
    await addPurchaseOrderLines(
      companyId,
      projectId,
      po.id,
      group.projectItemIds.map((projectItemId) => ({ source: "item" as const, projectItemId }))
    );
    created += 1;
  }

  return { suggestions, created };
}

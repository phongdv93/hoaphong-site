import Link from "next/link";
import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import {
  formatDimensionsMm,
  formatProductPrimaryCode,
  shortDescription,
} from "@/lib/factory/display";
import { listFactoryProducts } from "@/lib/factory/products";
import { requireActiveTenantCompany } from "@/lib/projects/with-active-tenant";
import { Plus } from "lucide-react";

export default async function FactoryProductListPage() {
  const ctx = await requireActiveTenantCompany();
  if ("error" in ctx) {
    return (
      <ErpShell title="Sản phẩm & BOM" groupId="san-pham">
        <p className="text-sm text-rose-300">{ctx.error}</p>
      </ErpShell>
    );
  }

  let rows: Awaited<ReturnType<typeof listFactoryProducts>> = [];
  let loadError: string | null = null;
  try {
    rows = await ctx.run(() => listFactoryProducts());
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Không kết nối được database";
  }

  return (
    <ErpShell title="Sản phẩm & BOM" groupId="san-pham">
      <p className="text-slate-400 text-sm mb-6 max-w-2xl">
        Danh mục sản phẩm — hiển thị gọn: tên, mã, kích thước, mô tả rút gọn. Chi tiết (hãng, xuất xứ, BOM…) xem khi mở sản phẩm.
      </p>

      {loadError && (
        <>
          <DbSetupBanner />
          <p className="text-sm text-rose-300 mt-2">{loadError}</p>
        </>
      )}

      {!loadError && (
        <>
          <div className="mb-4">
            <Link href="/erp/san-pham/san-pham/new" className="btn-primary text-sm py-2 inline-flex items-center gap-1">
              <Plus size={16} /> Thêm sản phẩm
            </Link>
          </div>
          <div className="erp-table-wrap overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="erp-table-head">
                <tr>
                  <th className="px-4 py-3 text-left">Tên</th>
                  <th className="px-4 py-3 text-left">Mã</th>
                  <th className="px-4 py-3 text-left">Kích thước</th>
                  <th className="px-4 py-3 text-left">Mô tả ngắn</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Chưa có sản phẩm. Bấm &quot;Thêm sản phẩm&quot;.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id} className="erp-table-row">
                      <td className="px-4 py-3">
                        <Link
                          href={`/erp/san-pham/san-pham/${p.id}`}
                          className="font-medium text-white hover:text-sky hover:underline"
                        >
                          {p.name || "—"}
                        </Link>
                        {p.sourceProjectId ? (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            <Link
                              href={`/erp/du-an?p=${p.sourceProjectId}`}
                              className="text-sky/80 hover:underline"
                            >
                              Từ dự án #{p.sourceProjectId}
                            </Link>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {formatProductPrimaryCode(p)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                        {formatDimensionsMm(p.lengthMm, p.depthMm, p.heightMm)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[240px]">
                        {shortDescription(p.description)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/erp/san-pham/san-pham/${p.id}`} className="text-sky font-medium hover:underline text-xs">
                          Chi tiết →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ErpShell>
  );
}

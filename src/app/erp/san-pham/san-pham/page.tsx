import Link from "next/link";
import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
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
        Danh mục sản phẩm ERP — giá, NCC, ngày đặt hàng, mô tả. Hạng mục dự án tự thêm vào đây; có thể bổ sung mã range/gỗ/BOM cho sản xuất nội bộ. Chi tiết tái sử dụng:{" "}
        <Link href="/erp/san-pham/chi-tiet" className="text-sky hover:underline">
          danh mục chi tiết
        </Link>
        .
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
            <table className="w-full text-sm min-w-[640px]">
              <thead className="erp-table-head">
                <tr>
                  <th className="px-2 py-3 w-14">Ảnh</th>
                  <th className="px-4 py-3">Mã SP</th>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">NCC</th>
                  <th className="px-4 py-3">Giá</th>
                  <th className="px-4 py-3">Range</th>
                  <th className="px-4 py-3">Gỗ / Sơn</th>
                  <th className="px-4 py-3">CBM</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      Chưa có sản phẩm. Bấm &quot;Thêm sản phẩm&quot;.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id} className="erp-table-row">
                      <td className="px-2 py-2 w-14">
                        {p.imageUrl?.trim() ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.imageUrl.trim()} alt="" className="h-10 w-10 object-cover rounded border border-white/10" />
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/erp/san-pham/san-pham/${p.id}`}
                          className="text-sky hover:underline tabular-nums"
                          title="Mã sản phẩm (duy nhất trong công ty)"
                        >
                          #{p.id}
                        </Link>
                      </td>
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
                      <td className="px-4 py-3 text-xs text-slate-400">{p.supplier || "—"}</td>
                      <td className="px-4 py-3 text-xs tabular-nums">{p.price || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.rangeCode || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {p.woodCode || "—"} / {p.paintCode || "—"}
                      </td>
                      <td className="px-4 py-3">{p.cbmM3 ? p.cbmM3.toFixed(4) : "—"}</td>
                      <td className="px-4 py-3 text-xs">{p.status}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/erp/san-pham/san-pham/${p.id}`} className="text-sky font-medium hover:underline text-xs">
                          Mở →
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

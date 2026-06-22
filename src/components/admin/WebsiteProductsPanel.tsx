"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Import, X } from "lucide-react";
import { CrudManager } from "./CrudManager";
import { ERP } from "@/lib/paths";

type ErpProduct = {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  notes: string;
};

export function WebsiteProductsPanel() {
  const [importOpen, setImportOpen] = useState(false);
  const [erpProducts, setErpProducts] = useState<ErpProduct[] | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  async function openImport() {
    setImportOpen(true);
    setImportLoading(true);
    setImportError("");
    setErpProducts(null);
    const res = await fetch("/api/factory/products");
    setImportLoading(false);
    if (!res.ok) {
      setImportError(
        "Không đọc được sản phẩm ERP. Vào Module ERP, chọn công ty đang hoạt động rồi thử lại."
      );
      return;
    }
    setErpProducts(await res.json());
  }

  async function importOne(p: ErpProduct) {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        description: p.notes || "",
        price: p.price || "Liên hệ",
        image: p.imageUrl || "",
        category: "Từ ERP",
        published: false,
        featured: false,
        sortOrder: 0,
      }),
    });
    if (res.ok) {
      setReloadKey((k) => k + 1);
      alert(
        `Đã thêm "${p.name}" vào catalog website (đang ẩn — bật "Hiển thị" để public).`
      );
    } else {
      const j = await res.json().catch(() => ({}));
      alert(typeof j.error === "string" ? j.error : "Không thêm được");
    }
  }

  return (
    <>
      <div className="erp-card p-4 mb-6 text-sm text-slate-300 space-y-2">
        <p>
          <strong className="text-white">Sản phẩm website</strong> là catalog công khai trên{" "}
          <Link href="/san-pham" target="_blank" className="text-sky-light hover:underline">
            /san-pham
          </Link>
          . Tách biệt với{" "}
          <strong className="text-white">sản phẩm ERP</strong> (BOM, sản xuất, giá nội bộ).
        </p>
        <p className="text-slate-400 text-xs leading-relaxed">
          Có thể đưa một mặt hàng từ ERP lên website để bán — tạo bản ghi riêng trên catalog, không
          đồng bộ hai chiều. Kho gỗ và tồn kho thuộc ERP, không liên quan website.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => void openImport()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky/40 text-sky-light text-xs hover:bg-sky/10"
          >
            <Import size={14} /> Lấy từ ERP
          </button>
          <Link
            href={`${ERP.base}/san-pham/san-pham`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-slate-300 text-xs hover:bg-white/10"
          >
            <ExternalLink size={14} /> Mở sản phẩm ERP
          </Link>
        </div>
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="erp-card w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-medium text-white">Chọn sản phẩm ERP đưa lên website</h3>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 text-sm">
              {importLoading && <p className="text-slate-400">Đang tải…</p>}
              {importError && <p className="text-amber-300/90">{importError}</p>}
              {!importLoading && erpProducts?.length === 0 && (
                <p className="text-slate-400">Chưa có sản phẩm ERP.</p>
              )}
              <ul className="space-y-2">
                {erpProducts?.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-slate-100 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.price || "Liên hệ"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void importOne(p)}
                      className="shrink-0 text-xs px-2 py-1 rounded bg-sky text-white"
                    >
                      Đưa lên web
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <CrudManager
        key={reloadKey}
        apiPath="/api/products"
        title="sản phẩm website"
        defaultItem={{
          name: "",
          slug: "",
          description: "",
          price: "Liên hệ",
          image: "",
          category: "Khác",
          featured: false,
          published: true,
          sortOrder: 0,
        }}
        fields={[
          { key: "name", label: "Tên hiển thị" },
          { key: "slug", label: "Slug URL" },
          { key: "description", label: "Mô tả công khai", type: "textarea", rows: 3 },
          { key: "price", label: "Giá (hiển thị)" },
          { key: "image", label: "URL ảnh" },
          { key: "category", label: "Danh mục web" },
          { key: "sortOrder", label: "Thứ tự", type: "number" },
          { key: "featured", label: "Nổi bật", type: "checkbox" },
          { key: "published", label: "Hiển thị trên web", type: "checkbox" },
        ]}
      />
    </>
  );
}

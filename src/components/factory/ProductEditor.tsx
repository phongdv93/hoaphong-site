"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Calculator, ChevronDown, ChevronRight } from "lucide-react";
import type {
  BomLineInput,
  BomSection,
  FactoryBomLine,
  FactoryProduct,
  FactoryProductPayload,
  FactoryProductStatus,
} from "@/lib/factory/types";
import type { ProductSupplierOfferInput } from "@/lib/suppliers/types";
import { DEFAULT_PRODUCT_ORIGIN, formatDimensionsMm, formatProductPrimaryCode } from "@/lib/factory/display";
import { BomBlock } from "./BomBlock";
import { ProductSupplierOffersEditor } from "./ProductSupplierOffersEditor";
import { AppSelect } from "@/components/ui/AppSelect";
import { ErpDateInput } from "@/components/erp/ErpDateInput";

const emptyRow = (): BomLineInput => ({
  partCode: "",
  name: "",
  lengthMm: 0,
  depthMm: 0,
  heightMm: 0,
  qty: 1,
  unit: "cái",
  materialType: "",
  specNotes: "",
  remark: "",
});

function linesToDraft(lines: FactoryBomLine[], section: BomSection): BomLineInput[] {
  const filtered = lines.filter((l) => l.bomSection === section);
  if (filtered.length === 0) return [emptyRow()];
  return filtered.map((l) => ({
    partCode: l.part.code,
    name: l.part.name,
    lengthMm: l.part.lengthMm,
    depthMm: l.part.depthMm,
    heightMm: l.part.heightMm,
    qty: l.qty,
    unit: l.unit,
    materialType: l.part.materialType,
    specNotes: l.part.specNotes || l.part.description,
    remark: l.remark,
  }));
}

function computeCbmMm(lengthMm: number, depthMm: number, heightMm: number): number {
  if (!lengthMm || !depthMm || !heightMm) return 0;
  return (lengthMm * depthMm * heightMm) / 1e9;
}

export function ProductEditor({
  productId,
  defaultBrand = "",
  defaultOrigin = DEFAULT_PRODUCT_ORIGIN,
}: {
  productId: number | null;
  defaultBrand?: string;
  defaultOrigin?: string;
}) {
  const router = useRouter();
  const isNew = productId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState(defaultBrand);
  const [origin, setOrigin] = useState(defaultOrigin);
  const [supplier, setSupplier] = useState("");
  const [orderedAt, setOrderedAt] = useState("");
  const [rangeCode, setRangeCode] = useState("");
  const [woodCode, setWoodCode] = useState("");
  const [paintCode, setPaintCode] = useState("");
  const [customerBranchCode, setCustomerBranchCode] = useState("");
  const [lengthMm, setLengthMm] = useState(0);
  const [depthMm, setDepthMm] = useState(0);
  const [heightMm, setHeightMm] = useState(0);
  const [price, setPrice] = useState("");
  const [cbmM3, setCbmM3] = useState(0);
  const [weightKg, setWeightKg] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<FactoryProductStatus>("draft");
  const [sourceProjectId, setSourceProjectId] = useState<number | null>(null);
  const [bomWood, setBomWood] = useState<BomLineInput[]>([emptyRow()]);
  const [bomHardware, setBomHardware] = useState<BomLineInput[]>([emptyRow()]);
  const [bomPackaging, setBomPackaging] = useState<BomLineInput[]>([emptyRow()]);
  const [supplierOffers, setSupplierOffers] = useState<
    Array<ProductSupplierOfferInput & { supplierName?: string }>
  >([]);
  const [detailsOpen, setDetailsOpen] = useState(true);

  useEffect(() => {
    if (isNew) {
      setBrand(defaultBrand);
      setOrigin(defaultOrigin);
    }
  }, [isNew, defaultBrand, defaultOrigin]);

  const load = useCallback(async () => {
    if (productId === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/factory/products/${productId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Không tải được sản phẩm");
      }
      const data: { product: FactoryProduct; lines: FactoryBomLine[] } = await res.json();
      const p = data.product;
      setName(p.name);
      setDescription(p.description || "");
      setBrand(p.brand || defaultBrand);
      setOrigin(p.origin || DEFAULT_PRODUCT_ORIGIN);
      setSupplier(p.supplier || "");
      setOrderedAt(p.orderedAt || "");
      setRangeCode(p.rangeCode);
      setWoodCode(p.woodCode);
      setPaintCode(p.paintCode);
      setCustomerBranchCode(p.customerBranchCode);
      setLengthMm(p.lengthMm);
      setDepthMm(p.depthMm);
      setHeightMm(p.heightMm);
      setPrice(p.price);
      setCbmM3(p.cbmM3);
      setWeightKg(p.weightKg);
      setImageUrl(p.imageUrl || "");
      setNotes(p.notes);
      setStatus(p.status);
      setSourceProjectId(p.sourceProjectId);
      setBomWood(linesToDraft(data.lines, "wood"));
      setBomHardware(linesToDraft(data.lines, "hardware"));
      setBomPackaging(linesToDraft(data.lines, "packaging"));
      const offRes = await fetch(`/api/factory/products/${productId}/suppliers`);
      if (offRes.ok) {
        const offJ = await offRes.json();
        const offers = Array.isArray(offJ.offers) ? offJ.offers : [];
        setSupplierOffers(
          offers.map(
            (o: {
              supplierId: number;
              supplierName: string;
              unitPrice: string;
              leadTimeDays: number | null;
              isPreferred: boolean;
              notes: string;
            }) => ({
              supplierId: o.supplierId,
              supplierName: o.supplierName,
              unitPrice: o.unitPrice,
              leadTimeDays: o.leadTimeDays,
              isPreferred: o.isPreferred,
              notes: o.notes,
            })
          )
        );
      } else if (p.supplier?.trim()) {
        setSupplierOffers([
          {
            supplierId: 0,
            supplierName: p.supplier,
            unitPrice: p.price,
            leadTimeDays: null,
            isPreferred: true,
            notes: "",
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải");
    } finally {
      setLoading(false);
    }
  }, [productId, defaultBrand]);

  const codePreview = useMemo(
    () =>
      formatProductPrimaryCode({
        rangeCode,
        woodCode,
        paintCode,
        customerBranchCode,
      }),
    [rangeCode, woodCode, paintCode, customerBranchCode]
  );

  const sizePreview = useMemo(
    () => formatDimensionsMm(lengthMm, depthMm, heightMm),
    [lengthMm, depthMm, heightMm]
  );

  useEffect(() => {
    load();
  }, [load]);

  const payload = useMemo((): FactoryProductPayload => {
    const preferred = supplierOffers.find((o) => o.isPreferred) ?? supplierOffers[0];
    return {
      name,
      description,
      brand,
      origin,
      supplier: preferred?.supplierName?.trim() || supplier.trim(),
      orderedAt: orderedAt || null,
      rangeCode,
      woodCode,
      paintCode,
      customerBranchCode,
      lengthMm,
      depthMm,
      heightMm,
      price,
      cbmM3,
      weightKg,
      imageUrl,
      notes,
      status,
      bomWood,
      bomHardware,
      bomPackaging,
    };
  }, [
    name,
    description,
    brand,
    origin,
    supplier,
    supplierOffers,
    orderedAt,
    rangeCode,
    woodCode,
    paintCode,
    customerBranchCode,
    lengthMm,
    depthMm,
    heightMm,
    price,
    cbmM3,
    weightKg,
    imageUrl,
    notes,
    status,
    bomWood,
    bomHardware,
    bomPackaging,
  ]);

  async function saveSupplierOffers(targetId: number) {
    const resolved: ProductSupplierOfferInput[] = [];
    for (const o of supplierOffers) {
      const name = o.supplierName?.trim();
      if (!name && !o.supplierId) continue;
      let supplierId = o.supplierId;
      if (!supplierId && name) {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const j = await res.json();
          supplierId = j.supplier?.id as number;
        }
      }
      if (!supplierId) continue;
      resolved.push({
        supplierId,
        unitPrice: o.unitPrice,
        leadTimeDays: o.leadTimeDays,
        isPreferred: o.isPreferred,
        notes: o.notes,
      });
    }
    if (!resolved.length) return;
    await fetch(`/api/factory/products/${targetId}/suppliers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offers: resolved }),
    });
  }

  async function save() {
    if (!name.trim()) {
      alert("Nhập tên sản phẩm");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const res = await fetch("/api/factory/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lỗi tạo");
        await saveSupplierOffers(data.id);
        router.push(`/erp/san-pham/san-pham/${data.id}`);
        router.refresh();
        return;
      }
      const res = await fetch(`/api/factory/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lỗi lưu");
      await saveSupplierOffers(productId!);
      await load();
      alert("Đã lưu. Chi tiết đã đồng bộ danh mục tái sử dụng (gỗ/bao bì có kích thước mm; hardware kích thước trong tên).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-slate-400">Đang tải...</p>;
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm px-4 py-2">
          {error}
        </div>
      )}

      <div className="erp-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="flex-1 min-w-[12rem] bg-transparent border-0 border-b border-white/15 rounded-none px-0 py-1.5 text-lg font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-sky/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên sản phẩm *"
          />
          {sourceProjectId ? (
            <Link
              href={`/erp/du-an?p=${sourceProjectId}`}
              className="text-xs text-sky/90 hover:underline shrink-0"
            >
              ← Dự án #{sourceProjectId}
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-400 mb-1">Hãng</label>
            <input className="input-field py-1.5 w-full" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-1">Xuất xứ</label>
            <input className="input-field py-1.5 w-full" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-1">Dài (mm)</label>
            <input type="number" className="input-field py-1.5 w-full" value={lengthMm || ""} onChange={(e) => setLengthMm(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-1">Sâu (mm)</label>
            <input type="number" className="input-field py-1.5 w-full" value={depthMm || ""} onChange={(e) => setDepthMm(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-1">Cao (mm)</label>
            <input type="number" className="input-field py-1.5 w-full" value={heightMm || ""} onChange={(e) => setHeightMm(Number(e.target.value) || 0)} />
          </div>
        </div>
        {sizePreview ? (
          <p className="text-[11px] text-slate-500 -mt-2">Kích thước: {sizePreview}</p>
        ) : null}

        <div>
          <label className="block font-medium text-slate-400 mb-1 text-xs">Mã sản phẩm</label>
          <div className="flex flex-wrap items-center gap-2">
            <input className="input-field py-1.5 w-16 text-center" value={rangeCode} onChange={(e) => setRangeCode(e.target.value)} placeholder="Range" title="Range" />
            <span className="text-slate-600">·</span>
            <input className="input-field py-1.5 w-16 text-center" value={woodCode} onChange={(e) => setWoodCode(e.target.value)} placeholder="Gỗ" title="Gỗ" />
            <span className="text-slate-600">·</span>
            <input className="input-field py-1.5 w-16 text-center" value={paintCode} onChange={(e) => setPaintCode(e.target.value)} placeholder="Sơn" title="Sơn" />
            <span className="text-slate-600">·</span>
            <input className="input-field py-1.5 w-24" value={customerBranchCode} onChange={(e) => setCustomerBranchCode(e.target.value)} placeholder="Mã KH" />
            {codePreview ? (
              <span className="text-[11px] text-slate-500 font-mono ml-1">{codePreview}</span>
            ) : null}
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-400 mb-1 text-xs">Mô tả</label>
          <textarea
            className="input-field py-2 text-sm w-full min-h-[10rem] resize-y leading-relaxed"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="Thông số kỹ thuật, quy cách, đơn vị tính…"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-400 mb-1 text-xs">Ghi chú nội bộ</label>
          <input
            className="input-field py-1.5 text-xs w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Chỉ dùng trong ERP — không hiển thị báo giá"
          />
        </div>
      </div>

      <div className="erp-card overflow-hidden">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.03] border-b border-white/5"
        >
          {detailsOpen ? (
            <ChevronDown size={16} className="text-slate-500 shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-slate-500 shrink-0" />
          )}
          <span className="font-semibold text-slate-200 text-sm">Giá mua & BOM</span>
        </button>

        {detailsOpen && (
          <div className="p-4 space-y-4">
            <ProductSupplierOffersEditor
              offers={supplierOffers}
              onChange={setSupplierOffers}
              disabled={saving}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs border-t border-white/10 pt-4">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Ngày đặt hàng</label>
                <ErpDateInput
                  value={orderedAt}
                  onChange={setOrderedAt}
                  onCommit={setOrderedAt}
                  className="input-field py-1.5 w-full"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">CBM (m³)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.000001"
                    className="input-field py-1.5 flex-1 min-w-0"
                    value={cbmM3 || ""}
                    onChange={(e) => setCbmM3(Number(e.target.value) || 0)}
                  />
                  <button
                    type="button"
                    className="btn-outline text-[11px] py-1.5 px-2 shrink-0"
                    title="Tính từ Dài×Sâu×Cao (mm)"
                    onClick={() => setCbmM3(Number(computeCbmMm(lengthMm, depthMm, heightMm).toFixed(6)))}
                  >
                    <Calculator size={12} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Cân (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field py-1.5 w-full"
                  value={weightKg || ""}
                  onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Giá tham chiếu</label>
                <input className="input-field py-1.5 w-full" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Trạng thái</label>
                <AppSelect
                  className="py-1.5 w-full"
                  value={status}
                  onChange={(v) => setStatus(v as FactoryProductStatus)}
                  options={[
                    { value: "draft", label: "Nháp" },
                    { value: "active", label: "Hiệu lực" },
                    { value: "archived", label: "Lưu trữ" },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 text-xs">
              <div className="flex-1 min-w-0">
                <label className="block font-medium text-slate-400 mb-1">Ảnh (URL)</label>
                <input
                  className="input-field py-1.5 w-full"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="sm:w-28 shrink-0 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 min-h-[4.5rem] p-2">
                {imageUrl.trim() ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- URL tùy ý từ ERP */
                  <img src={imageUrl.trim()} alt="" className="max-h-16 max-w-full object-contain rounded" />
                ) : (
                  <span className="text-slate-500 text-[10px]">Ảnh</span>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-white/10">
              <div>
                <h3 className="font-semibold text-slate-200 text-sm">BOM — 3 phần</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Gỗ: kích thước mm + gợi ý <strong>wood_species</strong>. Hardware: không lưu 3 cạnh (kích thước trong tên), tìm <strong>kho vật tư</strong>. Bao bì: chọn loại Âm dương / Nắp mở.
                </p>
              </div>
              <BomBlock
                section="wood"
                hint="Chọn loại gỗ từ kho loại gỗ; kích thước mm cho từng chi tiết."
                rows={bomWood}
                setRows={setBomWood}
              />
              <BomBlock
                section="hardware"
                hint="Kích thước ghi trong tên (VD Vít 4x15). Gõ tên → gợi ý kho; nút Kho = thêm mới."
                rows={bomHardware}
                setRows={setBomHardware}
              />
              <BomBlock
                section="packaging"
                hint="Loại bao bì: Âm dương hoặc Nắp mở."
                rows={bomPackaging}
                setRows={setBomPackaging}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm py-2">
          <Save size={16} className="inline mr-1" />
          {saving ? "Đang lưu…" : "Lưu sản phẩm & BOM"}
        </button>
        <Link href="/erp/san-pham/san-pham" className="btn-outline text-sm py-2 inline-flex items-center">
          Danh sách
        </Link>
        <Link href="/erp/san-pham/chi-tiet" className="btn-outline text-sm py-2 inline-flex items-center">
          Danh mục chi tiết
        </Link>
      </div>
    </div>
  );
}

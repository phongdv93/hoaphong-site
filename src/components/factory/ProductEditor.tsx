"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Calculator } from "lucide-react";
import type { BomLineInput, BomSection, FactoryBomLine, FactoryProduct, FactoryProductPayload, FactoryProductStatus } from "@/lib/factory/types";
import { BomBlock } from "./BomBlock";
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

export function ProductEditor({ productId }: { productId: number | null }) {
  const router = useRouter();
  const isNew = productId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const payload = useMemo((): FactoryProductPayload => {
    return {
      name,
      description,
      supplier,
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
    supplier,
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
    <div className="space-y-6 max-w-7xl">
      {!isNew && productId && !loading && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {name.trim() ? (
            <span className="text-white font-medium">{name}</span>
          ) : (
            <span className="text-slate-500 italic">Chưa đặt tên</span>
          )}
          {sourceProjectId ? (
            <Link
              href={`/erp/du-an?p=${sourceProjectId}`}
              className="text-xs text-sky/90 hover:underline"
            >
              ← Dự án #{sourceProjectId}
            </Link>
          ) : null}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm px-4 py-2">
          {error}
        </div>
      )}

      <div className="erp-card p-4">
        <h2 className="font-semibold text-slate-200 text-sm mb-3">Thông tin sản phẩm</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-2 text-xs">
          <div className="col-span-2 sm:col-span-3 lg:col-span-6">
            <label className="block font-medium text-slate-400 mb-0.5">Tên sản phẩm *</label>
            <input className="input-field py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-6">
            <label className="block font-medium text-slate-400 mb-0.5">Mô tả</label>
            <textarea
              className="input-field py-1.5 text-sm min-h-[52px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="col-span-2 sm:col-span-2 lg:col-span-3">
            <label className="block font-medium text-slate-400 mb-0.5">Nhà cung cấp</label>
            <input
              className="input-field py-1.5"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Mua từ đâu"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Ngày đặt hàng</label>
            <ErpDateInput
              value={orderedAt}
              onChange={setOrderedAt}
              onCommit={setOrderedAt}
              className="input-field py-1.5"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Mã range</label>
            <input className="input-field py-1.5" value={rangeCode} onChange={(e) => setRangeCode(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Mã gỗ</label>
            <input className="input-field py-1.5" value={woodCode} onChange={(e) => setWoodCode(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Mã sơn</label>
            <input className="input-field py-1.5" value={paintCode} onChange={(e) => setPaintCode(e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1 lg:col-span-3">
            <label className="block font-medium text-slate-400 mb-0.5">Mã KH / phiên bản nhánh</label>
            <input
              className="input-field py-1.5"
              value={customerBranchCode}
              onChange={(e) => setCustomerBranchCode(e.target.value)}
              placeholder="Mã khách hoặc nhánh"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Dài (mm)</label>
            <input
              type="number"
              className="input-field py-1.5"
              value={lengthMm || ""}
              onChange={(e) => setLengthMm(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Sâu (mm)</label>
            <input
              type="number"
              className="input-field py-1.5"
              value={depthMm || ""}
              onChange={(e) => setDepthMm(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Cao (mm)</label>
            <input
              type="number"
              className="input-field py-1.5"
              value={heightMm || ""}
              onChange={(e) => setHeightMm(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex gap-1 items-end">
            <div className="flex-1 min-w-0">
              <label className="block font-medium text-slate-400 mb-0.5">CBM (m³)</label>
              <input
                type="number"
                step="0.000001"
                className="input-field py-1.5"
                value={cbmM3 || ""}
                onChange={(e) => setCbmM3(Number(e.target.value) || 0)}
              />
            </div>
            <button
              type="button"
              className="btn-outline text-[11px] py-1.5 px-2 shrink-0 mb-px"
              title="Dài×Sâu×Cao (mm)"
              onClick={() => setCbmM3(Number(computeCbmMm(lengthMm, depthMm, heightMm).toFixed(6)))}
            >
              <Calculator size={12} />
            </button>
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Cân (kg)</label>
            <input
              type="number"
              step="0.01"
              className="input-field py-1.5"
              value={weightKg || ""}
              onChange={(e) => setWeightKg(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Giá</label>
            <input className="input-field py-1.5" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium text-slate-400 mb-0.5">Trạng thái</label>
            <AppSelect
              className="py-1.5"
              value={status}
              onChange={(v) => setStatus(v as FactoryProductStatus)}
              options={[
                { value: "draft", label: "Nháp" },
                { value: "active", label: "Hiệu lực" },
                { value: "archived", label: "Lưu trữ" },
              ]}
            />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-3">
            <label className="block font-medium text-slate-400 mb-0.5">Ảnh (URL)</label>
            <input
              className="input-field py-1.5"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-3 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 min-h-[72px] p-2">
            {imageUrl.trim() ? (
              /* eslint-disable-next-line @next/next/no-img-element -- URL tùy ý từ ERP */
              <img src={imageUrl.trim()} alt="" className="max-h-20 max-w-full object-contain rounded" />
            ) : (
              <span className="text-slate-500 text-[11px]">Xem trước ảnh</span>
            )}
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-6">
            <label className="block font-medium text-slate-400 mb-0.5">Ghi chú</label>
            <textarea className="input-field py-1.5 text-xs" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="erp-card p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-200 text-sm">BOM — 3 phần</h2>
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

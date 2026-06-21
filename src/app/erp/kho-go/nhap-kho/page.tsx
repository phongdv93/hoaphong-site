"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { WoodAppShell } from "@/components/wood/WoodAppShell";
import { BoardGridEditor } from "@/components/wood/BoardGridEditor";
import { Camera, Plus, Trash2 } from "lucide-react";
import type { WoodSpecies } from "@/lib/wood/types";
import { emptyGrid, gridToBoardInputs, type BoardGridLayout } from "@/lib/wood/grid";
import { ERP } from "@/lib/paths";
import { AppSelect } from "@/components/ui/AppSelect";

type BoardRow = { widthMm: string; quantity: string };

export default function NhapKhoPage() {
  const router = useRouter();
  const [species, setSpecies] = useState<WoodSpecies[]>([]);
  const [speciesId, setSpeciesId] = useState("");
  const [packingListNo, setPackingListNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [thicknessMm, setThicknessMm] = useState("25.4");
  const [lengthMm, setLengthMm] = useState("3200");
  const [photoEndGrain, setPhotoEndGrain] = useState("");
  const [photoPackingList, setPhotoPackingList] = useState("");
  const [grid, setGrid] = useState<BoardGridLayout>(() => emptyGrid(5, 4));
  const [uniformWidth, setUniformWidth] = useState("");
  const [uniformQty, setUniformQty] = useState("");
  const [reserveRows, setReserveRows] = useState<BoardRow[]>([
    { widthMm: "120", quantity: "2" },
    { widthMm: "100", quantity: "1" },
  ]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const gridTotal = useMemo(
    () => grid.rows.reduce((s, r) => s + r.reduce((a, q) => a + q, 0), 0),
    [grid]
  );

  useEffect(() => {
    fetch("/api/wood/species")
      .then((r) => r.json())
      .then((data) => {
        setSpecies(data);
        if (data[0]) setSpeciesId(String(data[0].id));
      });
  }, []);

  async function uploadPhoto(file: File, setter: (url: string) => void) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/wood/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) setter(json.url);
    else setMsg(json.error || "Upload lỗi");
  }

  function buildPayload() {
    const thickness = Number(thicknessMm);
    const length = Number(lengthMm);

    if (gridTotal > 0) {
      return {
        boards: gridToBoardInputs(grid, thickness, length),
        layoutGrid: grid,
      };
    }

    const uQty = Number(uniformQty) || 0;
    const uW = Number(uniformWidth) || 0;
    if (uQty > 0 && uW > 0) {
      return {
        boards: [{ widthMm: uW, quantity: uQty, thicknessMm: thickness, lengthMm: length }],
        layoutGrid: undefined as BoardGridLayout | undefined,
      };
    }

    const fromReserve = reserveRows
      .filter((r) => Number(r.widthMm) > 0 && (Number(r.quantity) || 0) > 0)
      .map((r) => ({
        widthMm: Number(r.widthMm),
        quantity: Number(r.quantity) || 1,
        thicknessMm: thickness,
        lengthMm: length,
      }));

    if (!fromReserve.length) return null;
    return { boards: fromReserve, layoutGrid: undefined };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const built = buildPayload();
    if (!built?.boards.length) {
      setMsg("Nhập lưới thực tế, kiện đồng kích, hoặc dự trù (ít nhất một thanh)");
      return;
    }
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/wood/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speciesId: Number(speciesId),
        packingListNo,
        supplier,
        thicknessMm: Number(thicknessMm),
        lengthMm: Number(lengthMm),
        photoEndGrain,
        photoPackingList,
        layoutGrid: built.layoutGrid,
        boards: built.boards,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      router.push(ERP.kien(json.id));
    } else {
      setMsg(json.error || "Lỗi lưu kiện");
    }
  }

  return (
    <WoodAppShell title="Nhập kho — Packing list">
      <form onSubmit={handleSubmit} className="max-w-5xl space-y-8">
        <section className="erp-card p-6 space-y-4">
          <h2 className="font-semibold text-navy">Thông tin kiện</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-sm">
              Loại gỗ *
              <AppSelect
                variant="light"
                value={speciesId}
                onChange={setSpeciesId}
                className="mt-1"
                options={species.map((s) => ({
                  value: String(s.id),
                  label: `${s.code} — ${s.name}`,
                }))}
              />
            </label>
            <label className="block text-sm">
              Số packing list *
              <input
                value={packingListNo}
                onChange={(e) => setPackingListNo(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm">
              Nhà cung cấp
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="block text-sm">
              Chiều dày kiện (mm) *
              <input
                type="number"
                step="0.1"
                value={thicknessMm}
                onChange={(e) => setThicknessMm(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm md:col-span-2">
              Chiều dài chung (mm) *
              <input
                type="number"
                value={lengthMm}
                onChange={(e) => setLengthMm(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                required
              />
            </label>
          </div>
        </section>

        <section className="erp-card p-6 space-y-4">
          <h2 className="font-semibold text-navy flex items-center gap-2">
            <Camera size={18} /> Ảnh chứng từ
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <label className="block text-sm">
              Mặt cạnh / đầu gỗ
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1 w-full text-sm"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], setPhotoEndGrain)}
              />
              {photoEndGrain && <img src={photoEndGrain} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
            </label>
            <label className="block text-sm">
              Packing list
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1 w-full text-sm"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], setPhotoPackingList)}
              />
              {photoPackingList && <img src={photoPackingList} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
            </label>
          </div>
        </section>

        <section className="bg-white rounded-xl border-2 border-sky/30 p-6 space-y-4">
          <h2 className="font-semibold text-navy">Lưới thực tế kiện (chính)</h2>
          <p className="text-sm text-midnight/60">
            Nhập đúng bố cục packing list: mỗi cột là một chiều rộng, mỗi hàng là một lớp thanh trong kiện.
          </p>
          <BoardGridEditor grid={grid} onChange={setGrid} />
        </section>

        <section className="erp-card p-6 space-y-4">
          <h2 className="font-semibold text-navy">Kiện đồng kích (tùy chọn)</h2>
          <p className="text-xs text-midnight/50">
            Dùng khi cả kiện cùng một rộng × số lượng. Chỉ áp dụng nếu lưới trên để trống (tổng = 0).
          </p>
          <div className="flex gap-4 max-w-md">
            <label className="flex-1 text-sm">
              Rộng (mm)
              <input
                type="number"
                value={uniformWidth}
                onChange={(e) => setUniformWidth(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
            <label className="w-32 text-sm">
              Số thanh cả kiện
              <input
                type="number"
                min={1}
                value={uniformQty}
                onChange={(e) => setUniformQty(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="bg-mist/50 rounded-xl border border-navy/10 p-6 space-y-4">
          <h2 className="font-semibold text-midnight/70">Dự trù — rộng × SL (phương án tham khảo)</h2>
          <p className="text-xs text-midnight/50">
            Chỉ dùng khi chưa nhập lưới và chưa nhập kiện đồng kích. Không thay thế lưới thực tế.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setReserveRows([...reserveRows, { widthMm: "", quantity: "1" }])}
              className="text-sm text-sky flex items-center gap-1"
            >
              <Plus size={16} /> Thêm dòng dự trù
            </button>
          </div>
          {reserveRows.map((row, i) => (
            <div key={i} className="flex gap-3 items-end">
              <label className="flex-1 text-sm">
                Rộng (mm)
                <input
                  type="number"
                  value={row.widthMm}
                  onChange={(e) => {
                    const next = [...reserveRows];
                    next[i].widthMm = e.target.value;
                    setReserveRows(next);
                  }}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="w-24 text-sm">
                SL
                <input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => {
                    const next = [...reserveRows];
                    next[i].quantity = e.target.value;
                    setReserveRows(next);
                  }}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
              <button type="button" onClick={() => setReserveRows(reserveRows.filter((_, j) => j !== i))} className="p-2 text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </section>

        {msg && <p className="text-red-500 text-sm">{msg}</p>}
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Đang lưu & dựng 3D..." : "Tạo kiện & xem mô hình 3D"}
        </button>
      </form>
    </WoodAppShell>
  );
}

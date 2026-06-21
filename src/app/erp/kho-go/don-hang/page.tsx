"use client";

import { useEffect, useState } from "react";
import { WoodAppShell } from "@/components/wood/WoodAppShell";
import { formatM3 } from "@/lib/wood/volume";
import type { ProductionOrder } from "@/lib/wood/types";

export default function DonHangPOPage() {
  const [pos, setPos] = useState<ProductionOrder[]>([]);
  const [poNumber, setPoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [requiredVolumeM3, setRequiredVolumeM3] = useState("");

  function load() {
    fetch("/api/wood/po")
      .then((r) => r.json())
      .then(setPos);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/wood/po", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poNumber,
        customerName,
        requiredVolumeM3: requiredVolumeM3 ? Number(requiredVolumeM3) : undefined,
      }),
    });
    setPoNumber("");
    setCustomerName("");
    setRequiredVolumeM3("");
    load();
  }

  return (
    <WoodAppShell title="Đơn hàng sản xuất (PO)">
      <form onSubmit={create} className="bg-white rounded-xl border border-navy/10 p-6 max-w-lg mb-8 space-y-3">
        <h2 className="font-semibold text-navy">Tạo PO mới</h2>
        <input
          placeholder="Số PO *"
          value={poNumber}
          onChange={(e) => setPoNumber(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Khách hàng / Nhà máy"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Khối yêu cầu (m³) — tùy chọn"
          type="number"
          step="0.0001"
          value={requiredVolumeM3}
          onChange={(e) => setRequiredVolumeM3(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <button type="submit" className="btn-primary text-sm">
          Thêm PO
        </button>
      </form>

      <div className="bg-white rounded-xl border border-navy/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-mist">
            <tr>
              <th className="px-4 py-3 text-left">PO</th>
              <th className="px-4 py-3 text-left">Khách</th>
              <th className="px-4 py-3 text-left">Yêu cầu</th>
              <th className="px-4 py-3 text-left">Đã phát</th>
              <th className="px-4 py-3 text-left">TT</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-medium">{p.poNumber}</td>
                <td className="px-4 py-3">{p.customerName}</td>
                <td className="px-4 py-3">{p.requiredVolumeM3 != null ? formatM3(p.requiredVolumeM3) : "—"}</td>
                <td className="px-4 py-3">{formatM3(p.issuedVolumeM3)}</td>
                <td className="px-4 py-3">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WoodAppShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Settings } from "lucide-react";
import {
  CHANNEL_LABELS,
  DECLARATION_STATUS_LABELS,
  DECLARATION_STATUS_TONES,
} from "@/lib/customs/constants";
import { IDA_PRESET_HQS4324 } from "@/lib/customs/ida-presets";
import type { ImportDeclaration } from "@/lib/customs/types";
import { CustomsSetupGate } from "./CustomsSetupGate";

export function ImportDeclarationsClient() {
  return (
    <CustomsSetupGate>
      <ImportDeclarationsList />
    </CustomsSetupGate>
  );
}

function ImportDeclarationsList() {
  const [items, setItems] = useState<ImportDeclaration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/customs/import-declarations");
    const j = await res.json();
    if (res.ok) setItems(j.items ?? []);
    setLoading(false);
  }

  async function createNew(preset?: string) {
    const res = await fetch("/api/customs/import-declarations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset ? { preset } : {}),
    });
    const j = await res.json();
    if (res.ok && j.id) {
      window.location.href = `/erp/xnk/hai-quan-nhap/${j.id}`;
    } else alert(j.error || "Tạo thất bại");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Lô hàng nhập khẩu</h2>
          <p className="text-sm text-slate-400 mt-1">
            3 bước: chứng từ → hàng → gửi. Không menu phức tạp như ECUS.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/erp/xnk/cau-hinh"
            className="inline-flex items-center gap-1.5 border border-white/15 text-slate-300 px-3 py-2 rounded-lg text-xs hover:bg-white/5"
          >
            <Settings size={14} /> Kết nối HQ
          </Link>
          <button
            type="button"
            onClick={() => void createNew(IDA_PRESET_HQS4324)}
            className="inline-flex items-center gap-2 border border-sky/50 text-sky-light px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky/10"
          >
            <Plus size={16} /> Lô HQS4324 (mẫu)
          </button>
          <button
            type="button"
            onClick={() => void createNew()}
            className="inline-flex items-center gap-2 bg-sky text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-light"
          >
            <Plus size={16} /> Lô trống
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/15">
          <p className="text-slate-400 text-sm mb-4">Chưa có lô hàng nào.</p>
          <button
            type="button"
            onClick={() => void createNew()}
            className="bg-sky text-white px-4 py-2 rounded-lg text-sm"
          >
            Tạo lô đầu tiên
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id}>
              <Link
                href={`/erp/xnk/hai-quan-nhap/${d.id}`}
                className="block rounded-xl border border-white/10 bg-white/[0.03] hover:border-sky/30 hover:bg-white/[0.05] px-4 py-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">
                      {d.invoiceNo || d.referenceCode}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {d.importerName || "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] px-2 py-0.5 rounded ${DECLARATION_STATUS_TONES[d.status]}`}
                  >
                    {DECLARATION_STATUS_LABELS[d.status]}
                  </span>
                </div>
                {(d.idaRegistrationNo || d.declarationNo) && (
                  <p className="text-[11px] text-sky-light/80 mt-2 font-mono">
                    {d.idaRegistrationNo || d.declarationNo}
                    {" · "}
                    {CHANNEL_LABELS[d.channel]}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

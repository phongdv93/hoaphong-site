"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { AppSelect } from "@/components/ui/AppSelect";
import {
  looksLikeHtmlTablePaste,
  looksLikeRawExcelPaste,
  parseMasterDataFile,
  parseMasterDataPaste,
} from "@/lib/customs/parse-master-file-client";

const TYPE_OPTIONS = [
  { value: "customs_office", label: "Cơ quan HQ xử lý" },
  { value: "import_port", label: "Cảng nhập / địa điểm dỡ (VN)" },
  { value: "export_port", label: "Cảng xuất / xếp hàng (nước ngoài)" },
  { value: "border_gate", label: "Cửa khẩu (cùng danh mục cảng nhập)" },
  { value: "warehouse", label: "Kho / KCN / ICD lưu hàng" },
  { value: "transport_mode", label: "Phương thức vận chuyển" },
  { value: "procedure_type", label: "Loại hình" },
] as const;

type MasterType = (typeof TYPE_OPTIONS)[number]["value"];

interface Item {
  id: number;
  code: string;
  name: string;
  extra: string;
}

export function CustomsMasterDataManager() {
  const [type, setType] = useState<MasterType>("customs_office");
  const [versionTag, setVersionTag] = useState("");
  const [source, setSource] = useState("customs-file");
  const [lines, setLines] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [totalHint, setTotalHint] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholder = useMemo(
    () => "Mỗi dòng: code[TAB]name[TAB]extra  (hoặc ; hoặc |)",
    []
  );

  const searchNow = useCallback(async (query: string, masterType: MasterType) => {
    searchAbort.current?.abort();
    const ac = new AbortController();
    searchAbort.current = ac;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/customs/master-data?type=${masterType}&q=${encodeURIComponent(query)}&limit=50`,
        { signal: ac.signal }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Không tải được danh mục");
        setItems([]);
        return;
      }
      setItems(j.items ?? []);
      setTotalHint(j.items?.length ?? 0);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Không tải được danh mục");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void searchNow(q, type);
    }, q.trim() ? 280 : 0);
    return () => clearTimeout(t);
  }, [q, type, searchNow]);

  async function onFilePicked(file: File | null) {
    if (!file) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const parsed = await parseMasterDataFile(file);
      setLines(parsed.lines);
      setFileName(file.name);
      setMessage(`Đã đọc ${parsed.previewCount} dòng từ file. Bấm «Import danh mục» để lưu.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được file");
    } finally {
      setLoading(false);
    }
  }

  async function importNow() {
    let payload = lines;
    try {
      if (looksLikeRawExcelPaste(lines)) {
        setError(
          "Đây là file Excel thô (PK…). Dùng «Chọn file» chọn file .htm từ customs.gov.vn."
        );
        return;
      }
      if (looksLikeHtmlTablePaste(lines)) {
        const rows = parseMasterDataPaste(lines);
        payload = rows.map((r) => [r.code, r.name, r.extra].join("\t")).join("\n");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được dữ liệu dán");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/customs/master-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, versionTag, source, lines: payload }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(j.error || "Import thất bại");
      return;
    }
    setMessage(`Đã import ${j.upserted ?? 0} dòng.`);
    await searchNow(q, type);
  }

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-sm text-slate-400">
        Danh mục HQ nạp sẵn: cơ quan xử lý (~225), cảng nhập (~123), kho/KCN (~41), cảng xuất
        quốc tế (~23), PTVT, loại hình. Gõ là lọc — chỉ import file khi HQ ban hành bảng mã mới.
      </p>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="block flex-1 min-w-[200px]">
          <span className="text-xs text-slate-400 mb-1 block">Tìm mã / tên / mô tả</span>
          <input
            className="input-field text-sm w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="vd: 01E1, Bắc Hà Nội, Nội Bài, HCM…"
            autoComplete="off"
          />
        </label>
        <label className="block min-w-[180px]">
          <span className="text-xs text-slate-400 mb-1 block">Loại danh mục</span>
          <AppSelect
            value={type}
            onChange={(v) => setType(v as MasterType)}
            options={TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        {loading ? "Đang tìm…" : `Hiển thị ${totalHint} dòng${q.trim() ? ` khớp «${q.trim()}»` : ""}.`}
      </p>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-white/[0.05] text-slate-400">
            <tr>
              <th className="text-left px-3 py-2">Mã</th>
              <th className="text-left px-3 py-2">Tên</th>
              <th className="text-left px-3 py-2">Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={3}>
                  {loading ? "Đang tải…" : q.trim() ? "Không có kết quả." : "Chưa có dữ liệu."}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-3 py-2 font-mono text-slate-200">{item.code}</td>
                  <td className="px-3 py-2 text-slate-300">{item.name || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{item.extra || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
        <summary className="cursor-pointer font-medium text-slate-200">
          Cập nhật danh mục từ file HQ (tùy chọn)
        </summary>
        <ul className="mt-3 space-y-2 text-xs text-slate-400 list-disc pl-5">
          <li>
            <strong className="text-slate-300">Phần mềm khai HQ chính thức</strong> (VNACCS / ECUS /
            phần mềm Tổng cục cấp sau khi đăng ký Terminal ID): thường có mục{" "}
            <em>Danh mục / Tra cứu mã</em> — export Excel hoặc copy bảng mã chi cục, cửa khẩu, kho
            bãi, loại hình, phương thức vận chuyển.
          </li>
          <li>
            <strong className="text-slate-300">Cổng một cửa quốc gia</strong> (
            <a
              href="https://vnsw.gov.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-light hover:underline"
            >
              vnsw.gov.vn
            </a>
            ): tra cứu mã dùng trên tờ khai; copy cột mã + tên về Excel rồi paste vào ô import bên
            dưới.
          </li>
          <li>
            <strong className="text-slate-300">Thư / tài liệu Tổng cục Hải quan</strong> khi cấp
            quyền phần mềm (file đính kèm danh mục mã cập nhật theo thông tư).
          </li>
          <li>
            Tại trang <strong className="text-slate-300">customs.gov.vn → Bảng mã chuẩn</strong>,
            bấm <strong className="text-slate-300">Tải về</strong> dòng{" "}
            <em>«Mã Chi cục Hải quan – Đội thủ tục»</em> — HQ thường tải về file{" "}
            <strong className="text-slate-300">.htm</strong> (không phải .xlsx). Dùng nút{" "}
            <strong className="text-slate-300">Chọn file</strong> bên dưới, chọn đúng file .htm vừa
            tải.
          </li>
          <li>
            Paste thủ công: mỗi dòng{" "}
            <code className="text-slate-300">mã[TAB]tên[TAB]ghi chú</code> — ví dụ{" "}
            <code className="text-slate-300">02CI[TAB]HQ cửa khẩu cảng SG KV1</code>.
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-amber-200/90">
          Nếu ô import hiện chữ <code className="text-amber-100">PK… [Content_Types].xml</code>{" "}
          là bạn đã dán nhầm file Excel. Xóa hết, dùng nút chọn file.
        </p>
      </details>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <label className="block">
          <span className="text-xs text-slate-400 mb-1 block">Version/tag</span>
          <input
            className="input-field text-sm"
            value={versionTag}
            onChange={(e) => setVersionTag(e.target.value)}
            placeholder="vd: HQ-2025-07-01"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-400 mb-1 block">Nguồn</span>
          <input
            className="input-field text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="customs-file"
          />
        </label>
      </div>

      <div className="rounded-xl border border-sky/30 bg-sky/10 px-4 py-3 space-y-2">
        <p className="text-sm text-sky-light font-medium">Import từ file .htm (Hải quan)</p>
        <p className="text-xs text-slate-400">
          customs.gov.vn → Bảng mã chuẩn → Tải về thường ra file{" "}
          <strong className="text-slate-300">.htm</strong> hoặc <strong className="text-slate-300">.xlsx</strong>.
          Cách nhanh nhất: <strong className="text-slate-300">chọn nguyên file</strong> — hệ thống tự lấy cột{" "}
          <strong className="text-slate-300">Mã Hải quan</strong> +{" "}
          <strong className="text-slate-300">Tên đơn vị Hải quan</strong>. Nếu copy tay trong Excel: chỉ chọn 2 cột đó
          (kèm dòng tiêu đề), không cần STT, chi cục vùng, tỉnh thành.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".htm,.html,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            void onFilePicked(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 border border-sky/40 bg-sky/20 text-sky-light px-4 py-2 rounded-lg text-sm hover:bg-sky/30 disabled:opacity-50"
        >
          <Upload size={16} />
          Chọn file (.htm / .xlsx)
        </button>
        {fileName && (
          <p className="text-xs text-slate-400">
            File: <span className="text-slate-200">{fileName}</span>
          </p>
        )}
      </div>

      <label className="block">
        <span className="text-xs text-slate-400 mb-1 block">
          Hoặc mở file .htm bằng Chrome → Ctrl+A → Copy → dán vào đây
        </span>
        <textarea
          className={`input-field text-sm min-h-40 font-mono ${
            looksLikeRawExcelPaste(lines)
              ? "border-rose-500/60"
              : looksLikeHtmlTablePaste(lines)
                ? "border-sky/40"
                : ""
          }`}
          value={lines}
          onChange={(e) => {
            setLines(e.target.value);
            setFileName("");
          }}
          placeholder={placeholder}
        />
        {looksLikeRawExcelPaste(lines) && (
          <p className="text-xs text-rose-300 mt-1">
            Phát hiện file Excel thô — xóa và dùng «Chọn file» ở trên.
          </p>
        )}
        {looksLikeHtmlTablePaste(lines) && !looksLikeRawExcelPaste(lines) && (
          <p className="text-xs text-sky-light mt-1">
            Đã nhận bảng HTML — bấm «Import danh mục» để lưu.
          </p>
        )}
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void importNow()}
          disabled={loading}
          className="bg-sky text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-light disabled:opacity-50"
        >
          {loading ? "Đang import..." : "Import danh mục"}
        </button>
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}
      {message && <p className="text-xs text-emerald-300">{message}</p>}
    </div>
  );
}


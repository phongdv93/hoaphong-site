"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomsMasterType } from "@/lib/customs/master-data";

export interface MasterCodeOption {
  code: string;
  name: string;
  extra?: string;
}

export function MasterCodePicker({
  label,
  type,
  value,
  onChange,
  disabled,
  placeholder,
  required,
}: {
  label: string;
  type: CustomsMasterType;
  value: string;
  onChange: (code: string, option?: MasterCodeOption) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<MasterCodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<MasterCodeOption | null>(null);
  const [checkError, setCheckError] = useState("");

  const verifyCode = useCallback(
    async (code: string) => {
      const c = code.trim();
      if (!c) {
        setVerified(null);
        setCheckError("");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/customs/master-data?type=${type}&exact=${encodeURIComponent(c)}`
        );
        const j = await res.json();
        if (j.verified && j.item) {
          setVerified(j.item);
          setCheckError("");
        } else {
          setVerified(null);
          setCheckError(
            `Mã «${c}» không có trong danh mục HQ. Chọn từ gợi ý hoặc cập nhật danh mục.`
          );
        }
      } catch {
        setCheckError("Không kiểm tra được mã với CSDL HQ.");
      } finally {
        setLoading(false);
      }
    },
    [type]
  );

  useEffect(() => {
    if (disabled || !value.trim()) return;
    void verifyCode(value);
  }, [disabled, value, verifyCode]);

  useEffect(() => {
    if (disabled) return;
    const q = value.trim();
    if (q.length < 1) {
      setOptions([]);
      return;
    }
    const t = setTimeout(() => {
      void fetch(
        `/api/customs/master-data?type=${type}&q=${encodeURIComponent(q)}&limit=12`
      )
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((j) =>
          setOptions(
            (j.items ?? []).map((x: { code: string; name: string; extra?: string }) => ({
              code: x.code,
              name: x.name,
              extra: x.extra,
            }))
          )
        )
        .catch(() => setOptions([]));
    }, 220);
    return () => clearTimeout(t);
  }, [type, value, disabled]);

  return (
    <label className="block">
      <span className="text-xs text-slate-400 mb-1 block">
        {label}
        {required && <span className="text-rose-400"> *</span>}
      </span>
      <input
        className={`input-field text-sm w-full ${
          checkError ? "border-rose-500/50" : verified ? "border-emerald-500/40" : ""
        }`}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 180);
          void verifyCode(value);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setVerified(null);
          setCheckError("");
        }}
        autoComplete="off"
      />
      {loading && <p className="text-[10px] text-slate-500 mt-0.5">Đang kiểm tra mã HQ…</p>}
      {verified && !loading && (
        <p className="text-[10px] text-emerald-300/90 mt-0.5 truncate" title={verified.name}>
          ✓ Khớp CSDL HQ: {verified.name}
          {verified.extra ? ` · ${verified.extra}` : ""}
        </p>
      )}
      {checkError && !loading && (
        <p className="text-[10px] text-rose-300 mt-0.5">{checkError}</p>
      )}
      {open && !disabled && options.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-white/15 bg-slate-900 shadow-lg text-xs z-20 relative">
          {options.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-sky/20 text-slate-200"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.code, o);
                  setVerified(o);
                  setCheckError("");
                  setOpen(false);
                }}
              >
                <span className="font-mono text-sky-light">{o.code}</span>
                <span className="text-slate-400 ml-2">{o.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

/** Gọi từ wizard trước khi chuyển bước / gửi. */
export async function verifyMasterCode(
  type: CustomsMasterType,
  code: string
): Promise<{ ok: boolean; message: string }> {
  const c = code.trim();
  if (!c) return { ok: false, message: "Chưa nhập mã" };
  const res = await fetch(
    `/api/customs/master-data?type=${type}&exact=${encodeURIComponent(c)}`
  );
  const j = await res.json().catch(() => ({}));
  if (j.verified && j.item) {
    return { ok: true, message: j.item.name };
  }
  return {
    ok: false,
    message: `Mã «${c}» không có trong danh mục HQ (CSDL mới nhất đã nạp trên hệ thống).`,
  };
}

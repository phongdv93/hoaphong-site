"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Customer } from "@/lib/marketing/customer-types";
import { customerToQuoteParty, filterCustomersForSuggest } from "@/lib/marketing/customer-party";
import type { QuoteParty } from "@/lib/quote/types";

const PARTY_FIELDS_EXTRA: { key: keyof QuoteParty; placeholder: string }[] = [
  { key: "address", placeholder: "Địa chỉ" },
  { key: "taxCode", placeholder: "Mã số thuế" },
  { key: "bankName", placeholder: "Ngân hàng" },
  { key: "bankAccount", placeholder: "Số tài khoản" },
];

function SuggestList({
  items,
  onPick,
}: {
  items: Customer[];
  onPick: (c: Customer) => void;
}) {
  if (!items.length) return null;
  return (
    <ul className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-48 overflow-y-auto rounded-lg border border-white/15 bg-[#0f1a2e] py-1 shadow-xl">
      {items.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left hover:bg-sky/15 transition-colors"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
          >
            <span className="block text-xs font-medium text-white truncate">{c.name}</span>
            <span className="block text-[10px] text-slate-muted truncate">
              {[c.taxCode && `MST ${c.taxCode}`, c.code, c.contactPerson].filter(Boolean).join(" · ")}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Khối khách hàng báo giá ERP — gợi ý từ danh mục marketing. */
export function CustomerPartyBlock({
  party,
  onChange,
  customers,
}: {
  party: QuoteParty;
  onChange: (party: QuoteParty) => void;
  customers: Customer[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [suggestField, setSuggestField] = useState<"company" | "taxCode" | null>(null);

  const hasExtraData = PARTY_FIELDS_EXTRA.some((f) => {
    const v = party[f.key];
    return typeof v === "string" && v.trim() !== "";
  });
  const showExtra = expanded || hasExtraData;

  const companySuggestions = useMemo(
    () => (suggestField === "company" ? filterCustomersForSuggest(customers, party.company ?? "") : []),
    [suggestField, customers, party.company]
  );
  const taxSuggestions = useMemo(
    () => (suggestField === "taxCode" ? filterCustomersForSuggest(customers, party.taxCode ?? "") : []),
    [suggestField, customers, party.taxCode]
  );

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setSuggestField(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pickCustomer = (c: Customer) => {
    onChange(customerToQuoteParty(c));
    setSuggestField(null);
    setExpanded(true);
  };

  return (
    <div ref={wrapRef} className="quote-party-pill-dark">
      <p className="quote-party-title-dark">Khách hàng</p>
      <p className="text-[10px] text-slate-muted mb-1">Gõ tên công ty hoặc MST để gợi ý</p>
      <div className="space-y-0.5">
        <div className="relative">
          <input
            type="text"
            value={party.company ?? ""}
            onChange={(e) => onChange({ ...party, company: e.target.value })}
            onFocus={() => setSuggestField("company")}
            placeholder="Tên công ty / tổ chức"
            autoComplete="off"
            className="quote-party-line-dark quote-party-line-dark-bold w-full"
          />
          <SuggestList items={companySuggestions} onPick={pickCustomer} />
        </div>
        <input
          type="text"
          value={party.name ?? ""}
          onChange={(e) => onChange({ ...party, name: e.target.value })}
          placeholder="Người liên hệ"
          className="quote-party-line-dark w-full"
        />
        <input
          type="text"
          value={party.phone ?? ""}
          onChange={(e) => onChange({ ...party, phone: e.target.value })}
          placeholder="Điện thoại"
          className="quote-party-line-dark w-full"
        />
        <input
          type="text"
          value={party.email ?? ""}
          onChange={(e) => onChange({ ...party, email: e.target.value })}
          placeholder="Email"
          className="quote-party-line-dark w-full"
        />
      </div>

      {showExtra && (
        <div className="space-y-0.5 mt-2 pt-2 border-t border-white/10">
          <textarea
            value={party.address ?? ""}
            onChange={(e) => onChange({ ...party, address: e.target.value })}
            placeholder="Địa chỉ"
            rows={2}
            className="quote-party-line-dark resize-none min-h-[2.5rem] w-full"
          />
          <div className="relative">
            <input
              type="text"
              value={party.taxCode ?? ""}
              onChange={(e) => onChange({ ...party, taxCode: e.target.value })}
              onFocus={() => setSuggestField("taxCode")}
              placeholder="Mã số thuế"
              autoComplete="off"
              className="quote-party-line-dark w-full"
            />
            <SuggestList items={taxSuggestions} onPick={pickCustomer} />
          </div>
          {PARTY_FIELDS_EXTRA.filter((f) => f.key !== "address" && f.key !== "taxCode").map((f) => (
            <input
              key={f.key}
              type="text"
              value={party[f.key] ?? ""}
              onChange={(e) => onChange({ ...party, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="quote-party-line-dark w-full"
            />
          ))}
        </div>
      )}

      {!hasExtraData && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[10px] mt-2 text-slate-muted hover:text-white"
        >
          {showExtra ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showExtra ? "Ẩn bớt" : "Thêm MST, ngân hàng…"}
        </button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { QuoteBuilder } from "@/components/quote/QuoteBuilder";
import { COMPANY_CHANGED_EVENT } from "@/lib/erp/events";
import { createNewQuoteDocument } from "@/lib/quote/new-quote";
import type { QuoteDocument, QuoteParty } from "@/lib/quote/types";
import type { CompanySummary } from "@/lib/projects/types";

/** Báo giá ERP — load/lưu server + seller theo công ty. */
export function ErpQuoteBuilder({
  quoteId,
  mode,
}: {
  quoteId?: number;
  mode?: "new";
}) {
  const router = useRouter();
  const isNew = mode === "new" || !quoteId || !Number.isFinite(quoteId);
  const [seller, setSeller] = useState<Partial<QuoteParty> | undefined>();
  const [initialDoc, setInitialDoc] = useState<QuoteDocument | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");

  const loadSeller = useCallback(async () => {
    try {
      const [listRes, activeRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/companies/active"),
      ]);
      if (!listRes.ok) return;
      const companies = (await listRes.json()) as CompanySummary[];
      let activeId: number | null = null;
      if (activeRes.ok) {
        const j = await activeRes.json();
        activeId = j.companyId ?? null;
      }
      const company = companies.find((c) => c.id === activeId) ?? companies[0];
      if (!company) return;
      setSeller({
        company: company.name,
        address: company.address,
        phone: company.phone,
        email: company.email,
        taxCode: company.taxCode,
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadSeller();
    const onCompanyChanged = () => void loadSeller();
    window.addEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
    return () => window.removeEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
  }, [loadSeller]);

  useEffect(() => {
    if (isNew) {
      setInitialDoc(createNewQuoteDocument({ seller }));
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/marketing/quotes/${quoteId}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Không tải được báo giá");
        }
        const row = await res.json();
        setInitialDoc(row.document as QuoteDocument);
        setError("");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Lỗi tải");
        setInitialDoc(null);
      })
      .finally(() => setLoading(false));
  }, [isNew, quoteId, seller]);

  useEffect(() => {
    if (isNew && seller && initialDoc && !initialDoc.seller.company?.trim()) {
      setInitialDoc((prev) =>
        prev ? createNewQuoteDocument({ seller, preserveFrom: prev }) : prev
      );
    }
  }, [isNew, seller, initialDoc]);

  if (loading) {
    return <p className="text-sm text-slate-muted px-2 py-4">Đang tải báo giá…</p>;
  }
  if (error || !initialDoc) {
    return (
      <div className="px-2 py-4 space-y-3">
        <p className="text-sm text-red-400">{error || "Không có dữ liệu"}</p>
        <Link href="/erp/marketing/bao-gia" className="quote-tool-btn text-xs inline-flex">
          <ArrowLeft size={14} /> Danh sách báo giá
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-1 pb-2">
        <Link
          href="/erp/marketing/bao-gia"
          className="inline-flex items-center gap-1.5 text-xs text-slate-muted hover:text-white"
        >
          <ArrowLeft size={14} /> Danh sách báo giá
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <QuoteBuilder
          key={isNew ? "new" : quoteId}
          variant="erp"
          defaultSeller={seller}
          initialDocument={initialDoc}
          erpQuoteId={isNew ? null : quoteId!}
          onErpQuoteSaved={(id) => {
            if (isNew) router.replace(`/erp/marketing/bao-gia/${id}`);
          }}
        />
      </div>
    </div>
  );
}

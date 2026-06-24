"use client";

import { useEffect, useState } from "react";
import { QuoteBuilder } from "@/components/quote/QuoteBuilder";
import { COMPANY_CHANGED_EVENT } from "@/lib/erp/events";
import type { QuoteParty } from "@/lib/quote/types";
import type { CompanySummary } from "@/lib/projects/types";

/** Báo giá ERP — seller mặc định theo công ty đang chọn. */
export function ErpQuoteBuilder() {
  const [seller, setSeller] = useState<Partial<QuoteParty> | undefined>();

  async function loadSeller() {
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
  }

  useEffect(() => {
    void loadSeller();
    const onCompanyChanged = () => void loadSeller();
    window.addEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
    return () => window.removeEventListener(COMPANY_CHANGED_EVENT, onCompanyChanged);
  }, []);

  return <QuoteBuilder variant="erp" defaultSeller={seller} />;
}

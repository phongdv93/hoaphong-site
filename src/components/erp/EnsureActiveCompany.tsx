"use client";

import { useEffect } from "react";
import { dispatchCompanyChanged } from "@/lib/erp/events";

/**
 * Đảm bảo cookie active_company khớp với companyId trong URL.
 * Dùng cho deep-link vào /erp/c/[code] trực tiếp khi cookie chưa set
 * hoặc đang trỏ vào công ty khác.
 */
export function EnsureActiveCompany({ companyId }: { companyId: number }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cur = await fetch("/api/companies/active").then((r) =>
          r.ok ? r.json() : null
        );
        if (cancelled) return;
        if (cur?.companyId === companyId) return;
        const res = await fetch("/api/companies/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        if (res.ok) dispatchCompanyChanged(companyId);
      } catch {
        // im lặng — UI không phụ thuộc kết quả này
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);
  return null;
}

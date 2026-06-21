"use client";

import { useEffect } from "react";
import { COMPANY_CHANGED_EVENT } from "@/lib/erp/events";

/** Gọi lại khi user đổi công ty (sidebar / picker) — tránh phải F5. */
export function useOnCompanyChanged(handler: () => void): void {
  useEffect(() => {
    const onChange = () => handler();
    window.addEventListener(COMPANY_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(COMPANY_CHANGED_EVENT, onChange);
  }, [handler]);
}

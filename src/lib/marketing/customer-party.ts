import type { Customer } from "@/lib/marketing/customer-types";
import type { QuoteParty } from "@/lib/quote/types";

export function customerToQuoteParty(c: Customer): QuoteParty {
  return {
    company: c.name,
    name: c.contactPerson || "",
    phone: c.contactPhone || c.phone || "",
    email: c.email || "",
    address: c.address || "",
    taxCode: c.taxCode || "",
    bankName: "",
    bankAccount: "",
  };
}

export function filterCustomersForSuggest(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  if (q.length < 2 && qDigits.length < 3) return [];

  return customers
    .filter((c) => {
      if (c.status === "inactive") return false;
      const name = c.name.toLowerCase();
      const tax = c.taxCode.replace(/\s/g, "").toLowerCase();
      const code = c.code.toLowerCase();
      if (q.length >= 2 && (name.includes(q) || code.includes(q))) return true;
      if (qDigits.length >= 3 && tax.includes(qDigits)) return true;
      return false;
    })
    .slice(0, 8);
}

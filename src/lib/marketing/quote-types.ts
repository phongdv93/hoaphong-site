import type { QuoteDocument } from "@/lib/quote/types";

export type MarketingQuoteSummary = {
  id: number;
  quoteNumber: string;
  quoteName: string;
  customerCompany: string;
  customerTaxCode: string;
  grandTotal: number;
  status: string;
  updatedAt: string;
};

export type MarketingQuoteRecord = MarketingQuoteSummary & {
  document: QuoteDocument;
  createdAt: string;
};

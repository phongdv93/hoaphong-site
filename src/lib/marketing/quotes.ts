import { tenantExecute, tenantQuery, tenantQueryOne } from "@/lib/db/tenant";
import { requireTenantCompanyIdFromContext } from "@/lib/db/tenant-context";
import { calcGrandTotal, normalizeQuoteDocument } from "@/lib/quote/calc";
import type { QuoteDocument } from "@/lib/quote/types";
import type { MarketingQuoteRecord, MarketingQuoteSummary } from "./quote-types";

function mapSummary(row: Record<string, unknown>): MarketingQuoteSummary {
  return {
    id: Number(row.id),
    quoteNumber: String(row.quote_number ?? ""),
    quoteName: String(row.quote_name ?? ""),
    customerCompany: String(row.customer_company ?? ""),
    customerTaxCode: String(row.customer_tax_code ?? ""),
    grandTotal: Number(row.grand_total ?? 0),
    status: String(row.status ?? "draft"),
    updatedAt: String(row.updated_at),
  };
}

function mapRecord(row: Record<string, unknown>): MarketingQuoteRecord {
  const doc = normalizeQuoteDocument(row.document as Record<string, unknown>);
  return {
    ...mapSummary(row),
    document: doc,
    createdAt: String(row.created_at),
  };
}

export async function listMarketingQuotes(): Promise<MarketingQuoteSummary[]> {
  const companyId = requireTenantCompanyIdFromContext();
  const rows = await tenantQuery(
    `SELECT id, quote_number, quote_name, customer_company, customer_tax_code,
            grand_total, status, updated_at
     FROM marketing_quotes
     WHERE company_id = $1
     ORDER BY updated_at DESC, id DESC`,
    [companyId]
  );
  return rows.map(mapSummary);
}

export async function getMarketingQuote(id: number): Promise<MarketingQuoteRecord | null> {
  const companyId = requireTenantCompanyIdFromContext();
  const row = await tenantQueryOne(
    `SELECT * FROM marketing_quotes WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  );
  return row ? mapRecord(row) : null;
}

export async function createMarketingQuote(
  doc: QuoteDocument,
  createdBy?: number | null
): Promise<number> {
  const companyId = requireTenantCompanyIdFromContext();
  const normalized = normalizeQuoteDocument(doc as unknown as Record<string, unknown>);
  const grandTotal = calcGrandTotal(normalized.rows, normalized.columns);
  const row = await tenantQueryOne<{ id: number }>(
    `INSERT INTO marketing_quotes (
       company_id, quote_number, quote_name, customer_company, customer_tax_code,
       grand_total, status, document, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
     RETURNING id`,
    [
      companyId,
      normalized.quoteNumber,
      normalized.savedName,
      normalized.customer.company ?? "",
      normalized.customer.taxCode ?? "",
      grandTotal,
      "saved",
      JSON.stringify(normalized),
      createdBy ?? null,
    ]
  );
  return row!.id;
}

export async function updateMarketingQuote(id: number, doc: QuoteDocument): Promise<void> {
  const companyId = requireTenantCompanyIdFromContext();
  const normalized = normalizeQuoteDocument(doc as unknown as Record<string, unknown>);
  const grandTotal = calcGrandTotal(normalized.rows, normalized.columns);
  await tenantExecute(
    `UPDATE marketing_quotes SET
       quote_number = $1, quote_name = $2, customer_company = $3, customer_tax_code = $4,
       grand_total = $5, document = $6::jsonb, status = 'saved', updated_at = NOW()
     WHERE id = $7 AND company_id = $8`,
    [
      normalized.quoteNumber,
      normalized.savedName,
      normalized.customer.company ?? "",
      normalized.customer.taxCode ?? "",
      grandTotal,
      JSON.stringify(normalized),
      id,
      companyId,
    ]
  );
}

export async function deleteMarketingQuote(id: number): Promise<void> {
  const companyId = requireTenantCompanyIdFromContext();
  await tenantExecute(`DELETE FROM marketing_quotes WHERE id = $1 AND company_id = $2`, [
    id,
    companyId,
  ]);
}

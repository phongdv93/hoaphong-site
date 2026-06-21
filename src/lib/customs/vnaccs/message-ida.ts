import type { ImportDeclaration, ImportDeclarationLine } from "../types";

/** Payload nội bộ — map sang XML/EDI theo gateway VNACCS */
export interface IdaPayload {
  procedure: "IDA";
  messageId: string;
  sentAt: string;
  importer: {
    taxCode: string;
    name: string;
  };
  declarant: { taxCode: string };
  declaration: {
    procedureTypeCode: string;
    customsOfficeCode: string;
    borderGateCode: string;
    loadingPortCode: string;
    transportModeCode: string;
    billOfLadingNo: string;
    invoiceNo: string;
    invoiceDate: string | null;
    contractNo: string;
    incoterms: string;
    currency: string;
    exchangeRate: number;
    totalInvoiceValue: number;
    freightAmount: number;
    insuranceAmount: number;
    countryOfExport: string;
    countryOfOrigin: string;
    expectedArrivalDate: string | null;
    warehouseCode: string;
    paymentMethodCode: string;
  };
  lines: {
    lineNo: number;
    hsCode: string;
    description: string;
    quantity: number;
    unitCode: string;
    unitPrice: number;
    currency: string;
    originCountry: string;
  }[];
}

export function buildIdaPayload(decl: ImportDeclaration, lines: ImportDeclarationLine[]): IdaPayload {
  return {
    procedure: "IDA",
    messageId: `IDA-${decl.id}-${Date.now()}`,
    sentAt: new Date().toISOString(),
    importer: {
      taxCode: decl.importerTaxCode,
      name: decl.importerName,
    },
    declarant: { taxCode: decl.declarantTaxCode },
    declaration: {
      procedureTypeCode: decl.procedureTypeCode,
      customsOfficeCode: decl.customsOfficeCode,
      borderGateCode: decl.borderGateCode,
      loadingPortCode: decl.loadingPortCode,
      transportModeCode: decl.transportModeCode,
      billOfLadingNo: decl.billOfLadingNo,
      invoiceNo: decl.invoiceNo,
      invoiceDate: decl.invoiceDate,
      contractNo: decl.contractNo,
      incoterms: decl.incoterms,
      currency: decl.currency,
      exchangeRate: decl.exchangeRate,
      totalInvoiceValue: decl.totalInvoiceValue,
      freightAmount: decl.freightAmount,
      insuranceAmount: decl.insuranceAmount,
      countryOfExport: decl.countryOfExport,
      countryOfOrigin: decl.countryOfOrigin,
      expectedArrivalDate: decl.expectedArrivalDate,
      warehouseCode: decl.warehouseCode,
      paymentMethodCode: decl.paymentMethodCode,
    },
    lines: lines.map((l) => ({
      lineNo: l.lineNo,
      hsCode: l.hsCode,
      description: l.description,
      quantity: l.quantity,
      unitCode: l.unitCode,
      unitPrice: l.unitPrice,
      currency: l.currency,
      originCountry: l.originCountry,
    })),
  };
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** XML đơn giản — gateway/đối tác có thể map sang chuẩn PAA/VNACCS đầy đủ */
export function buildIdaXml(payload: IdaPayload): string {
  const d = payload.declaration;
  const lineXml = payload.lines
    .map(
      (l) => `
    <Line>
      <LineNo>${l.lineNo}</LineNo>
      <HSCode>${xmlEscape(l.hsCode)}</HSCode>
      <Description>${xmlEscape(l.description)}</Description>
      <Quantity>${l.quantity}</Quantity>
      <UnitCode>${xmlEscape(l.unitCode)}</UnitCode>
      <UnitPrice>${l.unitPrice}</UnitPrice>
      <Currency>${xmlEscape(l.currency)}</Currency>
      <OriginCountry>${xmlEscape(l.originCountry)}</OriginCountry>
    </Line>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<VNACCSMessage version="1.0">
  <Header>
    <Procedure>${payload.procedure}</Procedure>
    <MessageId>${xmlEscape(payload.messageId)}</MessageId>
    <SentAt>${payload.sentAt}</SentAt>
  </Header>
  <Importer>
    <TaxCode>${xmlEscape(payload.importer.taxCode)}</TaxCode>
    <Name>${xmlEscape(payload.importer.name)}</Name>
  </Importer>
  <Declarant>
    <TaxCode>${xmlEscape(payload.declarant.taxCode)}</TaxCode>
  </Declarant>
  <Declaration>
    <ProcedureTypeCode>${xmlEscape(d.procedureTypeCode)}</ProcedureTypeCode>
    <CustomsOfficeCode>${xmlEscape(d.customsOfficeCode)}</CustomsOfficeCode>
    <BorderGateCode>${xmlEscape(d.borderGateCode)}</BorderGateCode>
    <LoadingPortCode>${xmlEscape(d.loadingPortCode)}</LoadingPortCode>
    <TransportModeCode>${xmlEscape(d.transportModeCode)}</TransportModeCode>
    <BillOfLadingNo>${xmlEscape(d.billOfLadingNo)}</BillOfLadingNo>
    <InvoiceNo>${xmlEscape(d.invoiceNo)}</InvoiceNo>
    <InvoiceDate>${d.invoiceDate ?? ""}</InvoiceDate>
    <ContractNo>${xmlEscape(d.contractNo)}</ContractNo>
    <Incoterms>${xmlEscape(d.incoterms)}</Incoterms>
    <Currency>${xmlEscape(d.currency)}</Currency>
    <ExchangeRate>${d.exchangeRate}</ExchangeRate>
    <TotalInvoiceValue>${d.totalInvoiceValue}</TotalInvoiceValue>
    <FreightAmount>${d.freightAmount}</FreightAmount>
    <InsuranceAmount>${d.insuranceAmount}</InsuranceAmount>
    <CountryOfExport>${xmlEscape(d.countryOfExport)}</CountryOfExport>
    <CountryOfOrigin>${xmlEscape(d.countryOfOrigin)}</CountryOfOrigin>
    <ExpectedArrivalDate>${d.expectedArrivalDate ?? ""}</ExpectedArrivalDate>
    <WarehouseCode>${xmlEscape(d.warehouseCode)}</WarehouseCode>
    <PaymentMethodCode>${xmlEscape(d.paymentMethodCode)}</PaymentMethodCode>
  </Declaration>
  <Lines>${lineXml}
  </Lines>
</VNACCSMessage>`;
}

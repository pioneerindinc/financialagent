import { z } from "zod";
// Mirrored strict ERP v1 wire schema; source-only fields are never financial settlement truth.
export const FINANCIAL_AGENT_INVOICE_CONTRACT = "pioneer-customer-invoices-v1";
const text = z.string().max(1000).nullable(),
  date = z.iso.date().nullable(),
  stamp = z.iso.datetime().nullable();
const cents = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER)
  .nullable();
const flags = z.array(z.string().max(100)).max(50);
const mapping = z.enum([
  "repair-revenue",
  "equipment-sales",
  "part-sale-item",
  "standalone-item",
  "shipping-income",
  "unmapped",
]);
const terms = z
  .object({
    version: z.literal(1),
    code: text,
    label: text,
    days: z.number().int().min(0).max(999).nullable(),
    qualityFlags: flags,
  })
  .strict()
  .nullable();
export const financialInvoiceSchema = z
  .object({
    company: z.literal("pioneer"),
    sourceSystem: z.literal("pioneer-erp"),
    sourceType: z.enum([
      "part-sale-invoice",
      "repair-invoice",
      "standalone-invoice",
    ]),
    sourceId: z.string().regex(/^[a-f0-9]{64}$/),
    sourceRevision: z.string().regex(/^[a-f0-9]{64}$/),
    identityBasis: z.enum(["finance-invoice-id", "canonical-source"]),
    invoiceNumber: text,
    customer: z.object({ customerId: text, displayName: text }).strict(),
    invoiceDate: date,
    issuedAt: stamp,
    dueDate: date,
    dueDateSource: z.enum(["explicit", "missing"]),
    paymentTermsSnapshot: terms,
    currency: z.literal("USD"),
    amountUnit: z.literal("cents"),
    totals: z
      .object({
        sourceAmountCents: cents,
        immutableOriginalAmountCents: z.null(),
        subtotalCents: cents,
        shippingCents: cents,
        taxCents: cents,
        discountCents: cents,
        linesCents: cents,
      })
      .strict(),
    state: z.enum(["active", "voided", "cancelled", "unknown"]),
    sourcePresent: z.boolean(),
    lines: z
      .array(
        z
          .object({
            sourceLineId: z.string().max(100),
            identityBasis: z.literal("source-position"),
            lineType: z.enum(["item", "shipping"]),
            description: text,
            quantity: z.number().finite().nullable(),
            unitPriceCents: cents,
            amountCents: cents,
            itemReference: text,
            partId: text,
            unitId: text,
            mappingKey: mapping,
            dataQuality: flags,
          })
          .strict(),
      )
      .max(501),
    context: z
      .object({
        canonicalSourceId: z.string().regex(/^[a-f0-9]{24}$/),
        sourceInvoiceNumber: text,
        saleNumber: text,
        shipmentNumber: text,
        repairSalesOrderId: text,
        poNumber: text,
        billingProgram: text,
        warrantyRepair: z.boolean().nullable(),
      })
      .strict(),
    dataQuality: flags,
  })
  .strict();
export type FinancialInvoice = z.infer<typeof financialInvoiceSchema>;
// Local retained evidence intentionally excludes operational context.
export const retainedInvoiceSchema = financialInvoiceSchema.omit({
  context: true,
});
export type RetainedInvoice = z.infer<typeof retainedInvoiceSchema>;
export const financialInvoicePageSchema = z
  .object({
    contract: z.literal(FINANCIAL_AGENT_INVOICE_CONTRACT),
    capturedAt: z.iso.datetime(),
    period: z
      .object({
        from: z.iso.date(),
        to: z.iso.date(),
        includesUndated: z.literal(true),
      })
      .strict(),
    sourceConsistency: z.literal("mongo-snapshot-per-request"),
    records: z.array(financialInvoiceSchema).max(100),
    pagination: z
      .object({
        total: z.number().int().nonnegative(),
        limit: z.number().int().positive(),
        scanRevision: z.string().length(64),
        nextCursor: z.string().max(2048).nullable(),
        complete: z.boolean(),
      })
      .strict(),
  })
  .strict();

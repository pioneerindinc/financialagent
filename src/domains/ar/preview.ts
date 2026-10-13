import "server-only";
import { PIONEER_COMPANY } from "../../lib/accounting-cutover";
import { authorize, type Actor } from "../../lib/auth/policy";
import { assert } from "../../lib/errors";
import { arCompany } from "./config";
import { scanInvoices, scanQuery } from "./client";

/** Read-only projection of a complete validated scan. Never call persistence here. */
export async function previewInvoices(
  actor: Actor,
  companyId: string,
  input: unknown,
) {
  assert(actor.kind === "human", "Human authentication required", 403);
  authorize(actor, companyId, "finance:read");
  assert(
    companyId === PIONEER_COMPANY && companyId === arCompany(),
    "ERP company is not bound to this FinancialAgent company",
    403,
  );
  const query = scanQuery.parse(input);
  // The existing client validates ALL pages. Its limit is a page size; the
  // preview additionally applies the user's limit to the complete result.
  const scan = await scanInvoices({
    ...query,
    limit: Math.min(query.limit, 50),
  });
  assert(
    scan.records.length <= query.limit,
    `ERP window exceeds the preview maximum of ${query.limit} invoices. Narrow the date range; no partial preview is shown.`,
    413,
  );
  return {
    from: scan.from,
    to: scan.to,
    limit: query.limit,
    complete: true as const,
    invoiceCount: scan.records.length,
    lineCount: scan.records.reduce(
      (sum, { record }) => sum + record.lines.length,
      0,
    ),
    // Deliberately omit operational context, customer IDs, terms and line detail.
    invoices: scan.records.map(({ record }) => ({
      sourceId: record.sourceId,
      invoiceNumber: record.invoiceNumber,
      customer: record.customer.displayName,
      invoiceDate: record.invoiceDate,
      totalAmountCents: record.totals.sourceAmountCents,
      sourceRevision: record.sourceRevision,
    })),
  };
}

export type InvoicePreview = Awaited<ReturnType<typeof previewInvoices>>;

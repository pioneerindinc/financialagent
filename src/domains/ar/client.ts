import "server-only";
import { z } from "zod";
import { assert, DomainError } from "../../lib/errors";
import {
  financialInvoicePageSchema,
  FINANCIAL_AGENT_INVOICE_CONTRACT,
  type FinancialInvoice,
} from "./contract";
import { erpConnection } from "./config";

export const scanQuery = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict()
  .refine(
    (v) =>
      v.from <= v.to &&
      (Date.parse(v.to) - Date.parse(v.from)) / 86400000 < 366,
    "Use an inclusive window of at most 366 days",
  );
export type Scan = {
  records: { record: FinancialInvoice; capturedAt: string }[];
  scanRevision: string;
  from: string;
  to: string;
};
const errors: Record<number, string> = {
  400: "ERP rejected the invoice query",
  401: "ERP invoice credential was rejected",
  403: "ERP invoice principal lacks permission",
  409: "ERP invoice scan changed; discard and restart the entire scan",
  413: "ERP source/response bounds exceeded; narrow the window or review source bounds (smaller pages only fix response size)",
  422: "ERP source evidence is ambiguous or unsafe; source review required",
  503: "ERP invoice snapshot is unavailable; retry the complete scan later",
};
async function pageJson(response: Response) {
  const reader = response.body?.getReader();
  assert(reader, "ERP returned no invoice body", 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      assert(size <= 2_097_152, "ERP response exceeds supported size", 413);
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await reader.cancel();
  }
}
/** Fetch every page before exposing any records to persistence. No partial scan succeeds. */
export async function scanInvoices(
  input: unknown,
  fetcher: typeof fetch = fetch,
): Promise<Scan> {
  const query = scanQuery.parse(input);
  const { origin, key } = erpConnection();
  const scanTimeout = AbortSignal.timeout(90_000);
  for (let attempt = 0; attempt < 3; attempt++) {
    const records: Scan["records"] = [];
    const cursors = new Set<string>();
    const ids = new Set<string>();
    let cursor: string | null = null,
      revision: string | undefined,
      total: number | undefined,
      lineCount = 0;
    let restart = false;
    do {
      const url = new URL(
        "/api/integrations/financial-agent/customer-invoices",
        origin,
      );
      url.search = new URLSearchParams({
        contract: FINANCIAL_AGENT_INVOICE_CONTRACT,
        from: query.from,
        to: query.to,
        limit: String(query.limit),
        ...(cursor ? { cursor } : {}),
      }).toString();
      let response: Response;
      try {
        response = await fetcher(url, {
          headers: { Authorization: `Bearer ${key}` },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.any([scanTimeout, AbortSignal.timeout(30_000)]),
        });
      } catch {
        throw new DomainError(
          "ERP invoice request unavailable; no scan imported",
          503,
        );
      }
      if (response.status === 409) {
        await response.body?.cancel();
        restart = true;
        break;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new DomainError(
          errors[response.status] || "ERP invoice request failed",
          response.status in errors ? response.status : 502,
        );
      }
      let page;
      try {
        page = financialInvoicePageSchema.parse(await pageJson(response));
      } catch (error) {
        if (error instanceof DomainError) throw error;
        throw new DomainError(
          "ERP invoice response failed contract validation",
          502,
        );
      }
      assert(
        page.period.from === query.from &&
          page.period.to === query.to &&
          page.pagination.limit === query.limit,
        "ERP invoice page parameters changed",
        502,
      );
      revision ??= page.pagination.scanRevision;
      total ??= page.pagination.total;
      assert(
        revision === page.pagination.scanRevision &&
          total === page.pagination.total,
        "ERP scan consistency changed; restart the entire scan",
        409,
      );
      // Bound a FinancialAgent atomic import independently of the ERP's larger export bounds.
      assert(
        total <= 250,
        "FinancialAgent atomic scan limit is 250 invoices; narrow the date window",
        413,
      );
      assert(
        page.records.length <= query.limit &&
          page.pagination.complete === (page.pagination.nextCursor === null),
        "Invalid ERP pagination",
        502,
      );
      for (const record of page.records) {
        assert(
          !ids.has(record.sourceId),
          "Duplicate invoice across ERP pages",
          502,
        );
        ids.add(record.sourceId);
        assert(
          !record.invoiceDate ||
            (record.invoiceDate >= query.from &&
              record.invoiceDate <= query.to),
          "ERP invoice outside requested range",
          502,
        );
        lineCount += record.lines.length;
        assert(
          lineCount <= 5000,
          "FinancialAgent scan line bound exceeded; narrow the window",
          413,
        );
        records.push({ record, capturedAt: page.capturedAt });
      }
      assert(records.length <= total, "ERP page count exceeds scan total", 502);
      cursor = page.pagination.nextCursor;
      if (cursor) {
        assert(
          page.records.length > 0 && !cursors.has(cursor),
          "ERP pagination did not advance",
          502,
        );
        cursors.add(cursor);
      }
    } while (cursor);
    if (restart) continue;
    assert(
      records.length === total,
      "Incomplete ERP scan; nothing imported",
      502,
    );
    return { records, scanRevision: revision!, from: query.from, to: query.to };
  }
  throw new DomainError(errors[409], 409);
}

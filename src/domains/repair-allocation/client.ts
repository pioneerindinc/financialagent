import "server-only";
import { z } from "zod";
import { erpConnection } from "../ar/config";
import { assert, DomainError } from "../../lib/errors";
import { ALLOCATION_COMPANY, ALLOCATION_CONTRACT, ALLOCATION_PATH,
  allocationHash, allocationPageSchema, type AllocationRecord } from "./contract";

export const allocationScanQuery = z.object({ from: z.iso.date(), to: z.iso.date(),
  limit: z.number().int().min(1).max(50).default(25) }).strict().refine(q =>
  q.from <= q.to && (Date.parse(q.to) - Date.parse(q.from)) / 86400000 < 366,
  "Use a complete window of at most 366 inclusive dates");
export type AllocationScan = { records: AllocationRecord[]; scanRevision: string;
  from: string; to: string; complete: true };
const errors: Record<number, string> = {
  400: "ERP rejected the allocation query", 401: "ERP allocation credential was rejected",
  403: "ERP allocation principal lacks permission", 409: "ERP allocation scan changed; restart it",
  413: "ERP allocation bounds exceeded; narrow the window", 422: "ERP allocation evidence is invalid",
  503: "ERP allocation snapshot unavailable",
};
async function boundedJson(response: Response) {
  const reader = response.body?.getReader();
  assert(reader, "ERP returned no allocation body", 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      assert(size <= 2_097_152, "ERP allocation response exceeds supported size", 413);
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { await reader.cancel(); }
}

/** Returns evidence only after every page and revision has passed validation. */
export async function scanAllocationEvidence(input: unknown, fetcher: typeof fetch = fetch): Promise<AllocationScan> {
  const query = allocationScanQuery.parse(input);
  const { origin, key } = erpConnection();
  const deadline = AbortSignal.timeout(90_000);
  for (let attempt = 0; attempt < 3; attempt++) {
    const records: AllocationRecord[] = [], ids = new Set<string>(), cursors = new Set<string>();
    let cursor: string | null = null, scanRevision: string | undefined, total: number | undefined;
    let restart = false;
    do {
      const url = new URL(ALLOCATION_PATH, origin);
      url.search = new URLSearchParams({ contract: ALLOCATION_CONTRACT, company: ALLOCATION_COMPANY,
        from: query.from, to: query.to, limit: String(query.limit), ...(cursor ? { cursor } : {}) }).toString();
      let response: Response;
      try {
        response = await fetcher(url, { method: "GET", headers: { Authorization: `Bearer ${key}` },
          cache: "no-store", redirect: "error",
          signal: AbortSignal.any([deadline, AbortSignal.timeout(30_000)]) });
      } catch { throw new DomainError("ERP allocation request unavailable; scan discarded", 503); }
      if (response.status === 409) { await response.body?.cancel(); restart = true; break; }
      if (!response.ok) {
        await response.body?.cancel();
        throw new DomainError(errors[response.status] || "ERP allocation request failed",
          response.status in errors ? response.status : 502);
      }
      let page: z.infer<typeof allocationPageSchema>;
      try { page = allocationPageSchema.parse(await boundedJson(response)); }
      catch (error) {
        if (error instanceof DomainError) throw error;
        throw new DomainError("ERP allocation response failed strict contract validation", 502);
      }
      assert(page.companyId === ALLOCATION_COMPANY && page.period.from === query.from &&
        page.period.to === query.to && page.pagination.limit === query.limit,
      "ERP allocation page parameters changed", 502);
      scanRevision ??= page.pagination.scanRevision;
      total ??= page.pagination.total;
      assert(scanRevision === page.pagination.scanRevision && total === page.pagination.total,
        "ERP allocation scan changed; discard all pages", 409);
      assert(page.pagination.complete === (page.pagination.nextCursor === null) &&
        page.records.length <= query.limit, "Invalid ERP allocation pagination", 502);
      for (const record of page.records) {
        assert(!ids.has(record.recordId), "Duplicate allocation evidence record", 502);
        ids.add(record.recordId);
        const utcDate = new Date(record.evidence.originalFinalizedAt).toISOString().slice(0, 10);
        assert(utcDate >= query.from && utcDate <= query.to,
          "ERP allocation evidence outside requested window", 502);
        records.push(record);
      }
      assert(records.length <= total, "ERP allocation page count exceeds total", 502);
      cursor = page.pagination.nextCursor;
      if (cursor) {
        assert(page.records.length > 0 && !cursors.has(cursor), "ERP allocation cursor did not advance", 502);
        cursors.add(cursor);
      }
    } while (cursor);
    if (restart) continue;
    assert(records.length === total, "Incomplete ERP allocation scan; no result", 502);
    const ordered = [...records].sort((a, b) =>
      Date.parse(a.evidence.originalFinalizedAt) - Date.parse(b.evidence.originalFinalizedAt) ||
      a.evidence.operationId.localeCompare(b.evidence.operationId) ||
      a.evidence.evidenceRevision - b.evidence.evidenceRevision);
    assert(ordered.every((record, index) => record.recordId === records[index].recordId),
      "ERP allocation order changed", 502);
    assert(allocationHash(records.map(record => [record.recordId, record.contentHash])) === scanRevision,
      "ERP allocation scan revision mismatch", 502);
    const groups = new Map<string, AllocationRecord[]>();
    for (const record of records) groups.set(record.evidence.operationId,
      [...(groups.get(record.evidence.operationId) || []), record]);
    for (const group of groups.values()) for (let index = 0; index < group.length; index++) {
      const record = group[index], first = group[0];
      assert(record.evidence.evidenceRevision === index + 1 &&
        record.isLatestRevision === (index === group.length - 1) &&
        record.evidence.finalizationEventId === first.evidence.finalizationEventId &&
        record.evidence.originalFinalizedAt === first.evidence.originalFinalizedAt &&
        record.evidence.shipmentId === first.evidence.shipmentId,
      "Allocation correction history incomplete or inconsistent", 502);
    }
    return { records, scanRevision: scanRevision!, from: query.from, to: query.to, complete: true };
  }
  throw new DomainError(errors[409], 409);
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoice } from "./ar-fixtures";
import { scanAllocationEvidence, type AllocationScan } from "../src/domains/repair-allocation/client";
import { allocationEvidenceSchema, allocationHash, allocationPageSchema, allocationRecordSchema,
  type AllocationRecord } from "../src/domains/repair-allocation/contract";
import { reconcileAllocationScan } from "../src/domains/repair-allocation/reconcile";

const sourceId = "a".repeat(64), sourceRevision = "1".repeat(64);
const finalizedAt = "2027-01-15T12:00:00.000Z", shipmentId = "fixture-shipment";
const operationId = allocationHash(["repair-allocation-operation-v1", "pioneer-industries", shipmentId, sourceId]);
const finalizationEventId = allocationHash(["repair-finalization-v1", shipmentId, finalizedAt]);
const config = { schemaVersion: 1, companyId: "pioneer-industries", revision: 1,
  allocationEnabled: true, effectiveDate: "2027-01-01",
  businessTimeZone: "America/Indiana/Indianapolis", policyVersion: 1,
  approvedBy: "fixture-approver", approvedAt: "2026-12-01T00:00:00.000Z", reason: "Fixture approval" };
const component = (kind: "repair-parts" | "labor-services", key: string, amountCents: number) => ({
  kind, componentId: allocationHash(["repair-allocation-component-v1", operationId, key]),
  evidenceReference: key, amountCents, partReference: key, partId: null, quantity: "1",
  exactUnitRate: null, priceBasis: "retained-repair-price", priceSource: "partRepairPrice",
  priceCapturedAt: null, precision: "recorded-extension-only", selectedUnitPrice: String(amountCents / 100),
  reportingDimension: kind === "repair-parts" ? "replacement-bottle" : "ordinary",
  condition: kind === "repair-parts" ? "used" : "service",
});
function record(revision = 1, status: "captured" | "exception" = "captured"): AllocationRecord {
  const base = { schemaVersion: 2, companyId: "pioneer-industries", operationId,
    evidenceRevision: revision, finalizationEventId,
    idempotencyKey: allocationHash(["repair-allocation-outcome-v2", operationId,
      finalizationEventId, sourceId, sourceRevision, revision]),
    shipmentId, invoiceIdentity: sourceId, sourceId, sourceRevision,
    originalFinalizedAt: finalizedAt, capturedAt: finalizedAt, capturedBy: "fixture-operator",
    config, environment: "development-test", sourceLineIds: ["line:0"],
    actualBilledRepairCents: 10000,
  };
  const evidence = allocationEvidenceSchema.parse(status === "captured" ? {
    ...base, status, components: [component("repair-parts", "bottle", 6000),
      component("labor-services", "labor", 4000)],
  } : { ...base, status, components: [], stage: "pricing",
    reasonCodes: ["missing-price"], missingFields: ["selectedUnitPrice"] });
  return allocationRecordSchema.parse({ recordId: `${operationId}:evidence:${revision}`,
    supersedesRecordId: revision === 1 ? null : `${operationId}:evidence:${revision - 1}`,
    isLatestRevision: true, contentHash: allocationHash(evidence), evidence });
}
function retained(overrides = {}) {
  const { context: ignored, ...value } = invoice({ sourceId, sourceRevision, issuedAt: finalizedAt, ...overrides });
  void ignored;
  return value;
}
function scan(records: AllocationRecord[]): AllocationScan {
  return { records, scanRevision: allocationHash(records.map(r => [r.recordId, r.contentHash])),
    from: "2027-01-01", to: "2027-01-31", complete: true };
}
function page(records: AllocationRecord[], cursor: string | null, total = records.length,
  scanRevision = scan(records).scanRevision) {
  return allocationPageSchema.parse({ contract: "pioneer-repair-revenue-allocation-v1",
    companyId: "pioneer-industries", capturedAt: finalizedAt,
    period: { from: "2027-01-01", to: "2027-01-31", timeBasis: "UTC-finalization-date" },
    sourceConsistency: "mongo-snapshot-per-request", records,
    pagination: { total, limit: 1, scanRevision, nextCursor: cursor, complete: cursor === null } });
}
beforeEach(() => {
  vi.stubEnv("PIONEER_ERP_BASE_URL", "https://erp-fixture.example/");
  vi.stubEnv("FINANCIAL_AGENT_API_KEY", "fixture-only-allocation-key");
});
afterEach(() => vi.unstubAllEnvs());

describe("Phase 5 strict supplementary ingestion", () => {
  it("reconciles complete evidence to the same billed repair lines without changing invoice data", () => {
    const stored = retained(), before = JSON.stringify(stored), evidence = record();
    const result = reconcileAllocationScan(scan([evidence]), [stored]);
    expect(result.reviews).toMatchObject([{ status: "reconciled", billedRepairCents: 10000,
      evidenceRecordId: evidence.recordId }]);
    expect(evidence.evidence.components.find(c => c.kind === "repair-parts")?.reportingDimension)
      .toBe("replacement-bottle");
    expect(JSON.stringify(stored)).toBe(before);
  });
  it("retains explicit exceptions and missing evidence without estimating components", () => {
    expect(reconcileAllocationScan(scan([record(1, "exception")]), [retained()]).reviews[0])
      .toMatchObject({ status: "source-exception", billedRepairCents: 10000,
        reasonCodes: ["missing-price"] });
    expect(reconcileAllocationScan(scan([]), [retained()]).reviews[0])
      .toMatchObject({ status: "missing-evidence", billedRepairCents: 10000 });
    const unboundIdentity = `unbound-repair:${shipmentId}`;
    const unboundOperation = allocationHash(["repair-allocation-operation-v1", "pioneer-industries",
      shipmentId, unboundIdentity]);
    const unboundEvidence = allocationEvidenceSchema.parse({ ...record(1, "exception").evidence,
      operationId: unboundOperation, invoiceIdentity: unboundIdentity,
      sourceId: null, sourceRevision: null,
      idempotencyKey: allocationHash(["repair-allocation-outcome-v2", unboundOperation,
        finalizationEventId, null, null, 1]), reasonCodes: ["missing-source-binding"] });
    const unbound = allocationRecordSchema.parse({ recordId: `${unboundOperation}:evidence:1`,
      supersedesRecordId: null, isLatestRevision: true,
      contentHash: allocationHash(unboundEvidence), evidence: unboundEvidence });
    const result = reconcileAllocationScan(scan([unbound]), [retained()]);
    expect(result.unboundExceptions).toEqual([unbound.recordId]);
    expect(result.reviews[0].status).toBe("missing-evidence");
  });
  it("uses only latest append-only revision and replay stays idempotent in memory", () => {
    const first = { ...record(1), isLatestRevision: false }, second = record(2);
    const input = scan([first, second]);
    const once = reconcileAllocationScan(input, [retained()]);
    expect(once.reviews[0].evidenceRecordId).toBe(second.recordId);
    expect(reconcileAllocationScan(input, [retained()])).toEqual(once);
    expect(() => reconcileAllocationScan(scan([second]), [retained()])).toThrow();
    expect(() => reconcileAllocationScan(scan([first, first]), [retained()])).toThrow();
  });
  it("rejects orphan, stale, foreign, misbound and unreconciled evidence", () => {
    const valid = record();
    expect(() => reconcileAllocationScan(scan([valid]), [])).toThrow();
    expect(() => reconcileAllocationScan(scan([valid]), [retained({ sourceRevision: "2".repeat(64) })])).toThrow();
    expect(() => reconcileAllocationScan(scan([valid]), [retained({ sourceType: "standalone-invoice" })])).toThrow();
    expect(() => reconcileAllocationScan(scan([valid]), [retained({ lines: [] })])).toThrow();
    expect(() => reconcileAllocationScan(scan([valid]), [retained({ lines: [
      { ...retained().lines[0], amountCents: 9000 }, retained().lines[1],
    ] })])).toThrow();
    expect(() => allocationRecordSchema.parse({ ...valid, evidence: { ...valid.evidence,
      companyId: "foreign" } })).toThrow();
  });
  it("excludes pre-effective, direct parts, truck and equipment invoices", () => {
    const prior = retained({ issuedAt: "2027-01-01T04:59:59.999Z" });
    expect(reconcileAllocationScan(scan([]), [prior]).outsidePolicyCount).toBe(1);
    for (const sourceType of ["part-sale-invoice", "standalone-invoice"] as const) {
      expect(reconcileAllocationScan(scan([]), [retained({ sourceType })]).outsidePolicyCount).toBe(1);
    }
    expect(reconcileAllocationScan(scan([]), [retained({ issuedAt: null })]).reviews[0].status)
      .toBe("missing-finalization-timestamp");
  });
  it("retrieves all strict pages and rejects partial, changed or malformed scans", async () => {
    const first = { ...record(1), isLatestRevision: false }, second = record(2);
    const revision = scan([first, second]).scanRevision;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(page([first], "next", 2, revision)))
      .mockResolvedValueOnce(Response.json(page([second], null, 2, revision)));
    const query = { from: "2027-01-01", to: "2027-01-31", limit: 1 };
    expect((await scanAllocationEvidence(query, fetcher)).records).toHaveLength(2);
    expect(new URL(String(fetcher.mock.calls[0][0])).pathname)
      .toBe("/api/integrations/financial-agent/repair-revenue-allocations");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store",
      headers: { Authorization: "Bearer fixture-only-allocation-key" } });
    const changed = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(page([first], "next", 2, revision)))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(Response.json(page([record()], null, 1)));
    expect((await scanAllocationEvidence(query, changed)).records).toHaveLength(1);
    const partial = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page([first], null, 2, revision)));
    await expect(scanAllocationEvidence(query, partial)).rejects.toMatchObject({ status: 502 });
    const malformed = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ...page([record()], null),
      records: [{ ...record(), extra: true }] }));
    await expect(scanAllocationEvidence(query, malformed)).rejects.toMatchObject({ status: 502 });
  });
});

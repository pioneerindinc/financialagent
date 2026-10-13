import { describe, expect, it } from "vitest";
import { invoice } from "./ar-fixtures";
import { allocationEvidenceSchema, allocationHash, allocationRecordSchema,
  type AllocationRecord } from "../src/domains/repair-allocation/contract";
import { type AllocationScan } from "../src/domains/repair-allocation/client";
import { buildAllocationManagementReport } from "../src/domains/repair-allocation/report";
import { reconcileAllocationScan } from "../src/domains/repair-allocation/reconcile";

const sourceId = "a".repeat(64), sourceRevision = "1".repeat(64), finalizedAt = "2027-01-01T05:00:00.000Z";
const shipmentId = "phase6-shipment";
const operationId = allocationHash(["repair-allocation-operation-v1", "pioneer-industries", shipmentId, sourceId]);
const eventId = allocationHash(["repair-finalization-v1", shipmentId, finalizedAt]);
const config = { schemaVersion: 1, companyId: "pioneer-industries", revision: 1, allocationEnabled: true,
  effectiveDate: "2027-01-01", businessTimeZone: "America/Indiana/Indianapolis", policyVersion: 1,
  approvedBy: "phase6-approver", approvedAt: "2026-12-01T00:00:00.000Z", reason: "fixture" };
const component = (kind: "repair-parts" | "labor-services", key: string, amountCents: number) => ({
  kind, componentId: allocationHash(["repair-allocation-component-v1", operationId, key]), evidenceReference: key,
  amountCents, partReference: key, partId: null, quantity: "1", exactUnitRate: null,
  priceBasis: "retained-repair-price", priceSource: "partRepairPrice", priceCapturedAt: null,
  precision: "recorded-extension-only", selectedUnitPrice: String(amountCents / 100),
  reportingDimension: "ordinary", condition: kind === "repair-parts" ? "used" : "service",
});
function captured(components = [component("repair-parts", "parts", 6000), component("labor-services", "labor", 4000)], billed = 10000): AllocationRecord {
  const base = { schemaVersion: 2, companyId: "pioneer-industries", operationId, evidenceRevision: 1,
    finalizationEventId: eventId, idempotencyKey: allocationHash(["repair-allocation-outcome-v2", operationId,
      eventId, sourceId, sourceRevision, 1]), shipmentId, invoiceIdentity: sourceId, sourceId, sourceRevision,
    originalFinalizedAt: finalizedAt, capturedAt: finalizedAt, capturedBy: "fixture", config,
    environment: "development-test", sourceLineIds: ["line:0"], actualBilledRepairCents: billed };
  const evidence = allocationEvidenceSchema.parse({ ...base, status: "captured", components });
  return allocationRecordSchema.parse({ recordId: `${operationId}:evidence:1`, supersedesRecordId: null,
    isLatestRevision: true, contentHash: allocationHash(evidence), evidence });
}
function scan(records: AllocationRecord[]): AllocationScan {
  return { records, scanRevision: allocationHash(records.map(r => [r.recordId, r.contentHash])),
    from: "2027-01-01", to: "2027-01-02", complete: true };
}
function repair(overrides = {}) {
  const base = invoice();
  const full = invoice({ sourceId, sourceRevision, issuedAt: finalizedAt,
    totals: { ...base.totals, sourceAmountCents: 10000, subtotalCents: 10000, shippingCents: 0, linesCents: 10000 },
    lines: [{ ...base.lines[0], amountCents: 10000, unitPriceCents: 10000 },
      { ...base.lines[1], amountCents: 0, unitPriceCents: 0 }], ...overrides });
  const { context, ...retained } = full;
  void context;
  return retained;
}

describe("Phase 6 prospective allocation management report", () => {
  it("includes the Indianapolis effective instant and keeps pre-effective billed value outside allocation", () => {
    const before = repair({ sourceId: "b".repeat(64), sourceRevision: "2".repeat(64),
      issuedAt: "2027-01-01T04:59:59.999Z" });
    expect(reconcileAllocationScan(scan([]), [repair()]).reviews[0].status).toBe("missing-evidence");
    const report = buildAllocationManagementReport({ scan: scan([]), invoices: [before, repair()],
      from: "2026-12-31", to: "2027-01-01" });
    expect(report.outsidePolicyRepairCents).toBe(10000);
    expect(report.unallocatedExceptionsCents).toBe(10000);
    expect(report.billedInvoiceCents).toBe(20000);
  });
  it("bridges repair classifications and direct parts sales exactly once", () => {
    const base = invoice();
    const partSaleFull = invoice({ sourceType: "part-sale-invoice", sourceId: "c".repeat(64),
      invoiceDate: "2027-01-01", issuedAt: "2027-01-01T05:00:00.000Z",
      totals: { ...base.totals, sourceAmountCents: 3500, subtotalCents: 3000, shippingCents: 500, linesCents: 3500 },
      lines: [{ ...base.lines[0], mappingKey: "part-sale-item", amountCents: 3000 },
        { ...base.lines[1], amountCents: 500 }] });
    const { context, ...partSale } = partSaleFull;
    void context;
    const report = buildAllocationManagementReport({ scan: scan([captured()]), invoices: [repair(), partSale],
      from: "2027-01-01", to: "2027-01-01" });
    expect(report).toMatchObject({ billedInvoiceCents: 13500, actualBilledRepairNetCents: 10000, repairParts4210Cents: 6000,
      repairServices4100Cents: 4000, directParts4200Cents: 3000, otherExistingBilledCents: 500,
      bridgeDifferenceCents: 0, classifiedRepairCount: 1, eligibleRepairClassifiedInvoiceCount: 1,
      eligibleRepairInvoiceCount: 1, directPartsInvoiceCount: 1 });
  });
  it("keeps supported non-repair item and shipping lines in Other existing billed value", () => {
    const mixed = repair({
      totals: { ...invoice().totals, sourceAmountCents: 12000, linesCents: 12000 },
      lines: [
        { ...invoice().lines[0], amountCents: 10000 },
        { ...invoice().lines[1], amountCents: 500 },
        { ...invoice().lines[0], sourceLineId: "line:1", mappingKey: "unmapped", amountCents: 1500 },
      ],
    });
    const report = buildAllocationManagementReport({ scan: scan([captured()]), invoices: [mixed],
      from: "2027-01-01", to: "2027-01-01" });
    expect(report).toMatchObject({ billedInvoiceCents: 12000, actualBilledRepairNetCents: 10000,
      repairParts4210Cents: 6000, repairServices4100Cents: 4000, otherExistingBilledCents: 2000,
      bridgeDifferenceCents: 0 });
  });
  it("rejects source billed total versus declared lines total mismatch", () => {
    const mismatched = repair({ totals: { ...invoice().totals, sourceAmountCents: 10001,
      linesCents: 10000, subtotalCents: 10000, shippingCents: 0 },
    lines: [{ ...invoice().lines[0], amountCents: 10000 }, { ...invoice().lines[1], amountCents: 0 }] });
    expect(() => buildAllocationManagementReport({ scan: scan([]), invoices: [mismatched],
      from: "2027-01-01", to: "2027-01-01" })).toThrow(/billed total does not match declared lines total/);
  });
  it("rejects declared lines total versus actual line sum mismatch", () => {
    const mismatched = repair({ totals: { ...invoice().totals, sourceAmountCents: 10000,
      linesCents: 10000, subtotalCents: 10000, shippingCents: 0 },
    lines: [{ ...invoice().lines[0], amountCents: 9000 }, { ...invoice().lines[1], amountCents: 0 }] });
    expect(() => buildAllocationManagementReport({ scan: scan([]), invoices: [mismatched],
      from: "2027-01-01", to: "2027-01-01" })).toThrow(/line sum does not match declared lines total/);
  });
  it("fails closed when finalization timestamp is missing instead of using invoiceDate", () => {
    const undated = repair({ issuedAt: null, invoiceDate: "2027-01-01" });
    expect(() => buildAllocationManagementReport({ scan: scan([]), invoices: [undated],
      from: "2027-01-01", to: "2027-01-01" })).toThrow(/finalization timestamp unavailable/);
  });
  it("uses inclusive Indianapolis local finalized-date filters and reports coverage numerator and denominator", () => {
    const insideStart = repair({ issuedAt: "2027-01-01T05:00:00.000Z" });
    const insideEnd = repair({ sourceId: "e".repeat(64), sourceRevision: "4".repeat(64),
      issuedAt: "2027-01-02T04:59:59.999Z" });
    const outside = repair({ sourceId: "f".repeat(64), sourceRevision: "5".repeat(64),
      issuedAt: "2027-01-02T05:00:00.000Z" });
    const report = buildAllocationManagementReport({ scan: scan([captured()]),
      invoices: [insideStart, insideEnd, outside], from: "2027-01-01", to: "2027-01-01" });
    expect(report).toMatchObject({ invoiceCount: 2, eligibleRepairClassifiedInvoiceCount: 1,
      eligibleRepairInvoiceCount: 2, unallocatedExceptionCount: 1, coveragePercent: 50,
      billedInvoiceCents: 20000, unallocatedExceptionsCents: 10000, bridgeDifferenceCents: 0 });
  });
  it("shows missing and unbound exceptions without estimating a classification", () => {
    const missing = repair();
    const capturedSource = captured().evidence;
    const boundExceptionEvidence = allocationEvidenceSchema.parse({ ...capturedSource, status: "exception",
      components: [], stage: "pricing", reasonCodes: ["missing-selected-price"], missingFields: ["selectedUnitPrice"] });
    const boundException = allocationRecordSchema.parse({ recordId: `${operationId}:evidence:1`,
      supersedesRecordId: null, isLatestRevision: true, contentHash: allocationHash(boundExceptionEvidence),
      evidence: boundExceptionEvidence });
    const unboundShipment = "unbound";
    const unboundEvent = allocationHash(["repair-finalization-v1", unboundShipment, finalizedAt]);
    const unboundOp = allocationHash(["repair-allocation-operation-v1", "pioneer-industries", unboundShipment, "unbound-repair:unbound"]);
    const source = capturedSource;
    const evidence = allocationEvidenceSchema.parse({ ...source, shipmentId: unboundShipment,
      operationId: unboundOp, finalizationEventId: unboundEvent,
      invoiceIdentity: "unbound-repair:unbound", sourceId: null, sourceRevision: null,
      idempotencyKey: allocationHash(["repair-allocation-outcome-v2", unboundOp, unboundEvent, null, null, 1]),
      status: "exception", components: [], actualBilledRepairCents: 10000, stage: "identity",
      reasonCodes: ["missing-source-binding"], missingFields: ["sourceRevision"] });
    const unbound = allocationRecordSchema.parse({ recordId: `${unboundOp}:evidence:1`, supersedesRecordId: null,
      isLatestRevision: true, contentHash: allocationHash(evidence), evidence });
    const report = buildAllocationManagementReport({ scan: scan([boundException, unbound]), invoices: [missing],
      from: "2027-01-01", to: "2027-01-01" });
    expect(report.unallocatedExceptionsCents).toBe(10000);
    expect(report.unallocatedExceptionCount).toBe(1);
    expect(report.unboundExceptionCount).toBe(1);
    expect(report.unboundExceptionRecordIds).toEqual([unbound.recordId]);
    expect(report.exceptions).toEqual([{ sourceId, sourceRevision, billedRepairCents: 10000,
      reasonCodes: ["missing-selected-price"] }]);
  });
  it("subtracts concession deductions so warranty gross calculation bridges to zero billed net", () => {
    const parts = component("repair-parts", "warranty-parts", 6000);
    const service = component("labor-services", "warranty-labor", 4000);
    const concession = { componentId: allocationHash(["warranty-concession"]), evidenceReference: "warranty",
      kind: "concession", amountCents: -10000, concessionType: "warranty", reason: "approved-warranty",
      authorizedBy: "fixture-approver" };
    const zero = repair({ totals: {
      ...invoice().totals, sourceAmountCents: 0, subtotalCents: 0, shippingCents: 0, linesCents: 0 },
      lines: [{ ...invoice().lines[0], amountCents: 0, unitPriceCents: 0 },
        { ...invoice().lines[1], amountCents: 0, unitPriceCents: 0 }] });
    const zeroRecord = captured([parts, service, concession] as never, 0);
    const report = buildAllocationManagementReport({ scan: scan([zeroRecord]), invoices: [zero],
      from: "2027-01-01", to: "2027-01-01" });
    expect(report).toMatchObject({ billedInvoiceCents: 0, repairParts4210Cents: 6000,
      repairServices4100Cents: 4000, concessionDeductionsCents: 10000, bridgeDifferenceCents: 0 });
  });
  it("keeps signed contract adjustments separate from parts and services", () => {
    const adjustment = { componentId: allocationHash(["contract-adjustment"]), evidenceReference: "contract",
      kind: "contract-pricing-adjustment", amountCents: -500, reason: "contract-price-versus-standard" };
    const contracted = repair({ totals: { ...invoice().totals, sourceAmountCents: 9500, subtotalCents: 9500,
      shippingCents: 0, linesCents: 9500 }, lines: [{ ...invoice().lines[0], amountCents: 9500,
        unitPriceCents: 9500 }, { ...invoice().lines[1], amountCents: 0, unitPriceCents: 0 }] });
    const record = captured([component("repair-parts", "parts", 6000), component("labor-services", "labor", 4000),
      adjustment] as never, 9500);
    const report = buildAllocationManagementReport({ scan: scan([record]), invoices: [contracted],
      from: "2027-01-01", to: "2027-01-01" });
    expect(report).toMatchObject({ repairParts4210Cents: 6000, repairServices4100Cents: 4000,
      contractAdjustmentsCents: -500, billedInvoiceCents: 9500, bridgeDifferenceCents: 0 });
  });
  it("rejects incomplete scans and produces repeatable totals for unchanged inputs", () => {
    const input = { scan: scan([captured()]), invoices: [repair()], from: "2027-01-01", to: "2027-01-01" };
    expect(buildAllocationManagementReport(input)).toEqual(buildAllocationManagementReport(input));
    expect(() => buildAllocationManagementReport({ ...input,
      scan: { ...input.scan, complete: false as true } })).toThrow(/Complete allocation scan/);
    expect(() => buildAllocationManagementReport({ ...input,
      scan: { ...input.scan, scanRevision: "0".repeat(64) } })).toThrow(/scan revision required/);
  });
  it("moves valid but unreconciled evidence into Unallocated / Exceptions", () => {
    const changedInvoice = repair({ lines: [{ ...invoice().lines[0], amountCents: 9000, unitPriceCents: 9000 },
      { ...invoice().lines[1], amountCents: 0, unitPriceCents: 0 }],
      totals: { ...invoice().totals, sourceAmountCents: 9000, subtotalCents: 9000, shippingCents: 0, linesCents: 9000 } });
    const report = buildAllocationManagementReport({ scan: scan([captured()]), invoices: [changedInvoice],
      from: "2027-01-01", to: "2027-01-01" });
    expect(report).toMatchObject({ billedInvoiceCents: 9000, actualBilledRepairNetCents: 9000,
      repairParts4210Cents: 0, repairServices4100Cents: 0, unallocatedExceptionsCents: 9000,
      unallocatedExceptionCount: 1, bridgeDifferenceCents: 0 });
    expect(report.exceptions[0].reasonCodes).toEqual(["billed-value-reconciliation-mismatch"]);
  });
  it("reports only recognized binding mismatches as billed exceptions without using their allocations", () => {
    const stale = repair({ sourceRevision: "2".repeat(64) });
    const misbound = repair({ issuedAt: "2027-01-01T06:00:00.000Z",
      lines: [{ ...invoice().lines[0], sourceLineId: "different-line", amountCents: 10000 },
        { ...invoice().lines[1], amountCents: 0 }] });
    const billedMismatch = repair({ lines: [{ ...invoice().lines[0], amountCents: 9000 },
      { ...invoice().lines[1], amountCents: 0 }],
    totals: { ...invoice().totals, sourceAmountCents: 9000, subtotalCents: 9000, shippingCents: 0, linesCents: 9000 } });
    const cases = [
      { invoice: stale, reason: "stale-source-revision" },
      { invoice: misbound, reason: "finalization-or-source-line-binding-mismatch" },
      { invoice: billedMismatch, reason: "billed-value-reconciliation-mismatch" },
    ];
    for (const item of cases) {
      const report = buildAllocationManagementReport({ scan: scan([captured()]), invoices: [item.invoice],
        from: "2027-01-01", to: "2027-01-01" });
      expect(report).toMatchObject({ complete: true, billedInvoiceCents: item.invoice.totals.sourceAmountCents,
        repairParts4210Cents: 0, repairServices4100Cents: 0,
        unallocatedExceptionsCents: item.invoice.lines[0].amountCents, unallocatedExceptionCount: 1,
        bridgeDifferenceCents: 0 });
      expect(report.exceptions[0].reasonCodes).toEqual([item.reason]);
    }
  });
  it("keeps malformed, incomplete, orphaned, and unsupported evidence fail-closed in report mode", () => {
    const input = { scan: scan([captured()]), invoices: [repair()], from: "2027-01-01", to: "2027-01-01" };
    expect(() => buildAllocationManagementReport({ ...input,
      scan: { ...input.scan, complete: false as true } })).toThrow(/Complete allocation scan/);
    expect(() => buildAllocationManagementReport({ ...input, invoices: [] })).toThrow(/missing imported invoice/);
    const unsupported = repair({ sourceType: "standalone-invoice" });
    expect(() => buildAllocationManagementReport({ ...input, invoices: [unsupported] }))
      .toThrow(/unsupported invoice family/);
    const invalidEvidence = { ...captured(), evidence: { ...captured().evidence, companyId: "foreign" } };
    const invalidScan = { ...scan([captured()]), records: [invalidEvidence as never],
      scanRevision: allocationHash([[invalidEvidence.recordId, invalidEvidence.contentHash]]) };
    expect(() => buildAllocationManagementReport({ ...input, scan: invalidScan })).toThrow();
  });
});

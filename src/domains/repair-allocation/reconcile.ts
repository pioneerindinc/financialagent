import { z } from "zod";
import { assert } from "../../lib/errors";
import { retainedInvoiceSchema } from "../ar/contract";
import { type AllocationScan } from "./client";
import { ALLOCATION_COMPANY, allocationHash, allocationRecordSchema, indianapolisDate,
  type AllocationRecord } from "./contract";

export type AllocationReview = {
  sourceId: string;
  sourceRevision: string;
  status: "reconciled" | "source-exception" | "missing-evidence" | "missing-finalization-timestamp" | "outside-policy";
  billedRepairCents: number;
  evidenceRecordId: string | null;
  reasonCodes: string[];
};
export type AllocationSimulation = {
  companyId: typeof ALLOCATION_COMPANY;
  allocationScanRevision: string;
  complete: true;
  reviews: AllocationReview[];
  unboundExceptions: string[];
  outsidePolicyCount: number;
};

export type AllocationReconciliationMode = "phase5-strict" | "phase6-management-report";

/** Pure, management-evidence-only reconciliation. Does not import or persist. */
export function reconcileAllocationScan(scan: AllocationScan, invoiceInput: unknown[],
  mode: AllocationReconciliationMode = "phase5-strict"): AllocationSimulation {
  assert(scan.complete && scan.from <= scan.to && /^[a-f0-9]{64}$/.test(scan.scanRevision),
    "Complete allocation scan required", 502);
  const invoices = invoiceInput.map(row => retainedInvoiceSchema.parse(row));
  const invoiceBySource = new Map<string, z.infer<typeof retainedInvoiceSchema>>();
  for (const invoice of invoices) {
    assert(invoice.sourceSystem === "pioneer-erp" && !invoiceBySource.has(invoice.sourceId),
      "Foreign or duplicate invoice identity", 409);
    invoiceBySource.set(invoice.sourceId, invoice);
  }
  const records = scan.records.map(row => allocationRecordSchema.parse(row));
  assert(allocationHash(records.map(record => [record.recordId, record.contentHash])) ===
    scan.scanRevision, "Allocation scan revision mismatch", 502);
  const groups = new Map<string, AllocationRecord[]>();
  const ids = new Set<string>();
  for (const record of records) {
    assert(!ids.has(record.recordId), "Duplicate allocation evidence", 409);
    ids.add(record.recordId);
    groups.set(record.evidence.operationId, [...(groups.get(record.evidence.operationId) || []), record]);
  }
  const latestBySource = new Map<string, AllocationRecord>();
  const unboundExceptions: string[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.evidence.evidenceRevision - b.evidence.evidenceRevision);
    for (let index = 0; index < group.length; index++) {
      const record = group[index], first = group[0];
      assert(record.evidence.evidenceRevision === index + 1 &&
        record.isLatestRevision === (index === group.length - 1) &&
        record.evidence.finalizationEventId === first.evidence.finalizationEventId &&
        record.evidence.originalFinalizedAt === first.evidence.originalFinalizedAt &&
        record.evidence.shipmentId === first.evidence.shipmentId &&
        record.evidence.invoiceIdentity === first.evidence.invoiceIdentity &&
        record.evidence.sourceId === first.evidence.sourceId &&
        record.evidence.sourceRevision === first.evidence.sourceRevision,
      "Out-of-order or incomplete allocation revisions", 502);
    }
    const latest = group[group.length - 1], e = latest.evidence;
    if (!e.sourceId || !e.sourceRevision) {
      assert(e.status === "exception" && e.reasonCodes.includes("missing-source-binding"),
        "Unbound complete allocation", 502);
      unboundExceptions.push(latest.recordId);
      continue;
    }
    assert(!latestBySource.has(e.sourceId), "Multiple allocation operations for one invoice", 409);
    latestBySource.set(e.sourceId, latest);
  }
  const sourceBindingErrors = new Map<string, string[]>();
  for (const [sourceId, record] of latestBySource) {
    const invoice = invoiceBySource.get(sourceId);
    assert(invoice, "Allocation evidence refers to a missing imported invoice", 409);
    assert(invoice.sourceType === "repair-invoice", "Allocation evidence refers to an unsupported invoice family", 409);
    if (invoice.sourceRevision !== record.evidence.sourceRevision) {
      assert(mode === "phase6-management-report", "Allocation source identity or revision is stale", 409);
      sourceBindingErrors.set(sourceId, ["stale-source-revision"]);
    }
  }
  const reviews: AllocationReview[] = [];
  let outsidePolicyCount = 0;
  for (const invoice of invoices) {
    const repairLines = invoice.lines.filter(line => line.lineType === "item" &&
      line.mappingKey === "repair-revenue");
    const record = latestBySource.get(invoice.sourceId);
    if (invoice.sourceType !== "repair-invoice" || !repairLines.length) {
      assert(!record, "Non-repair invoice has ordinary-repair allocation", 409);
      outsidePolicyCount++;
      continue;
    }
    const amounts = repairLines.map(line => line.amountCents);
    assert(amounts.every((amount): amount is number => amount !== null),
      "Repair invoice has unknown billed line amount", 409);
    const billedRepairCents = amounts.reduce((sum, amount) => sum + amount!, 0);
    assert(Number.isSafeInteger(billedRepairCents) && billedRepairCents >= 0,
      "Repair invoice billed amount is invalid", 409);
    if (!invoice.issuedAt) {
      assert(!record, "Allocation has no invoice finalization timestamp", 409);
      reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        status: "missing-finalization-timestamp", billedRepairCents, evidenceRecordId: null,
        reasonCodes: ["missing-finalization-timestamp"] });
      continue;
    }
    if (indianapolisDate(invoice.issuedAt) < "2027-01-01") {
      assert(!record, "Pre-effective invoice has allocation evidence", 409);
      outsidePolicyCount++;
      reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        status: "outside-policy", billedRepairCents, evidenceRecordId: null, reasonCodes: [] });
      continue;
    }
    if (!record) {
      reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        status: "missing-evidence", billedRepairCents, evidenceRecordId: null,
        reasonCodes: ["eligible-invoice-without-allocation-evidence"] });
      continue;
    }
    const e = record.evidence;
    const sourceErrors = sourceBindingErrors.get(invoice.sourceId);
    if (sourceErrors) {
      reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        status: "source-exception", billedRepairCents, evidenceRecordId: record.recordId,
        reasonCodes: sourceErrors });
      continue;
    }
    const lineBound = e.originalFinalizedAt === invoice.issuedAt &&
      e.sourceLineIds.length === repairLines.length &&
      new Set(e.sourceLineIds).size === repairLines.length &&
      repairLines.every(line => e.sourceLineIds.includes(line.sourceLineId));
    if (!lineBound) {
      assert(mode === "phase6-management-report", "Allocation finalization or source-line binding mismatch", 409);
      reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        status: "source-exception", billedRepairCents, evidenceRecordId: record.recordId,
        reasonCodes: ["finalization-or-source-line-binding-mismatch"] });
      continue;
    }
    if (e.status === "exception") {
      reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        status: "source-exception", billedRepairCents, evidenceRecordId: record.recordId,
        reasonCodes: e.reasonCodes });
      continue;
    }
    const bridgedComponents = e.components.reduce((sum, component) => sum + component.amountCents, 0);
    if (e.actualBilledRepairCents !== billedRepairCents || bridgedComponents !== billedRepairCents) {
      assert(mode === "phase6-management-report", "Allocation does not reconcile to billed repair lines", 409);
      reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        status: "source-exception", billedRepairCents, evidenceRecordId: record.recordId,
        reasonCodes: ["billed-value-reconciliation-mismatch"] });
      continue;
    }
    reviews.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
      status: "reconciled", billedRepairCents, evidenceRecordId: record.recordId, reasonCodes: [] });
  }
  return { companyId: ALLOCATION_COMPANY, allocationScanRevision: scan.scanRevision,
    complete: true, reviews, unboundExceptions, outsidePolicyCount };
}

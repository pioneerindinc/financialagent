import { assert } from "../../lib/errors";
import { retainedInvoiceSchema } from "../ar/contract";
import { type AllocationScan } from "./client";
import { allocationHash, allocationRecordSchema, indianapolisDate } from "./contract";
import { reconcileAllocationScan } from "./reconcile";

export type AllocationManagementReport = {
  companyId: "pioneer-industries";
  from: string;
  to: string;
  allocationScanRevision: string;
  complete: true;
  billedInvoiceCents: number;
  actualBilledRepairNetCents: number;
  repairParts4210Cents: number;
  repairServices4100Cents: number;
  directParts4200Cents: number;
  contractAdjustmentsCents: number;
  concessionDeductionsCents: number;
  unallocatedExceptionsCents: number;
  outsidePolicyRepairCents: number;
  otherExistingBilledCents: number;
  invoiceCount: number;
  classifiedRepairCount: number;
  eligibleRepairInvoiceCount: number;
  eligibleRepairClassifiedInvoiceCount: number;
  directPartsInvoiceCount: number;
  unallocatedExceptionCount: number;
  unboundExceptionCount: number;
  outsidePolicyRepairCount: number;
  coveragePercent: number;
  exceptions: Array<{ sourceId: string; sourceRevision: string; billedRepairCents: number; reasonCodes: string[] }>;
  unboundExceptionRecordIds: string[];
  bridgeDifferenceCents: 0;
};

const add = (left: number, right: number) => {
  const value = left + right;
  assert(Number.isSafeInteger(value), "Management report amount overflow", 502);
  return value;
};
function invoiceLocalDate(invoice: { issuedAt: string | null }) {
  return invoice.issuedAt ? indianapolisDate(invoice.issuedAt) : null;
}

function validateInvoiceAmounts(invoice: ReturnType<typeof retainedInvoiceSchema.parse>) {
  const total = invoice.totals.sourceAmountCents;
  const declaredLines = invoice.totals.linesCents;
  assert(total !== null && Number.isSafeInteger(total) && total >= 0,
    "Invoice billed total is unavailable; report cannot be complete", 502);
  assert(declaredLines !== null && Number.isSafeInteger(declaredLines),
    "Invoice declared line total is unavailable; report cannot be complete", 502);
  let sum = 0;
  for (const line of invoice.lines) {
    assert(line.amountCents !== null && Number.isSafeInteger(line.amountCents),
      "Invoice line amount is unavailable; report cannot be complete", 502);
    sum = add(sum, line.amountCents);
  }
  assert(declaredLines === sum, "Invoice line sum does not match declared lines total", 502);
  assert(total === declaredLines, "Invoice billed total does not match declared lines total", 502);
  return { total, sum };
}

/** Read-only report aggregation. Evidence classifies existing billed invoice value once. */
export function buildAllocationManagementReport(input: {
  scan: AllocationScan;
  invoices: unknown[];
  from: string;
  to: string;
}): AllocationManagementReport {
  assert(input.from <= input.to, "Invalid management report date range", 400);
  assert(input.scan.complete && allocationHash(input.scan.records.map(record =>
    [record.recordId, record.contentHash])) === input.scan.scanRevision,
  "Complete allocation scan revision required", 502);
  const invoices = input.invoices.map(row => retainedInvoiceSchema.parse(row));
  const selected = invoices.filter(invoice => {
    const date = invoiceLocalDate(invoice);
    assert(date, "Invoice finalization timestamp unavailable; report period completeness cannot be established", 502);
    return date >= input.from && date <= input.to;
  });
  const scan = { ...input.scan, records: input.scan.records.filter(record => {
    const date = indianapolisDate(record.evidence.originalFinalizedAt);
    return date >= input.from && date <= input.to;
  }) };
  // The filtered scan needs its own identity so the pure reconciler can prove the returned evidence set.
  scan.scanRevision = allocationHash(scan.records.map(record => [record.recordId, record.contentHash]));
  const reconciliation = reconcileAllocationScan(scan, selected, "phase6-management-report");
  const reviewBySource = new Map(reconciliation.reviews.map(review => [review.sourceId, review]));
  const recordById = new Map(input.scan.records.map(record => [record.recordId, allocationRecordSchema.parse(record)]));
  let billedInvoiceCents = 0, actualBilledRepairNetCents = 0;
  let repairParts4210Cents = 0, repairServices4100Cents = 0;
  let directParts4200Cents = 0, contractAdjustmentsCents = 0, concessionDeductionsCents = 0;
  let unallocatedExceptionsCents = 0, outsidePolicyRepairCents = 0, otherExistingBilledCents = 0;
  let classifiedRepairCount = 0, directPartsInvoiceCount = 0, unallocatedExceptionCount = 0;
  let outsidePolicyRepairCount = 0;
  let eligibleRepairInvoiceCount = 0;
  const exceptions: AllocationManagementReport["exceptions"] = [];

  for (const invoice of selected) {
    const { total } = validateInvoiceAmounts(invoice);
    billedInvoiceCents = add(billedInvoiceCents, total);
    const itemLines = invoice.lines.filter(line => line.lineType === "item");
    const repairLines = invoice.sourceType === "repair-invoice"
      ? itemLines.filter(line => line.mappingKey === "repair-revenue") : [];
    const repairBilled = repairLines.reduce((sum, line) => {
      assert(line.amountCents !== null, "Repair billed line is unavailable", 502);
      return add(sum, line.amountCents);
    }, 0);
    const review = reviewBySource.get(invoice.sourceId);
    if (repairLines.length) actualBilledRepairNetCents = add(actualBilledRepairNetCents, repairBilled);
    const eligibleRepair = repairLines.length > 0 && review?.status !== "outside-policy";
    if (eligibleRepair) eligibleRepairInvoiceCount++;
    if (repairLines.length && review?.status === "reconciled" && review.evidenceRecordId) {
      const record = recordById.get(review.evidenceRecordId);
      assert(record?.evidence.status === "captured", "Reconciled evidence record is unavailable", 502);
      for (const component of record.evidence.components) {
        switch (component.kind) {
          case "repair-parts": repairParts4210Cents = add(repairParts4210Cents, component.amountCents); break;
          case "labor-services": repairServices4100Cents = add(repairServices4100Cents, component.amountCents); break;
          case "contract-pricing-adjustment": contractAdjustmentsCents = add(contractAdjustmentsCents, component.amountCents); break;
          case "concession": concessionDeductionsCents = add(concessionDeductionsCents, -component.amountCents); break;
        }
      }
      classifiedRepairCount++;
      const otherLines = itemLines.filter(line => line.mappingKey !== "repair-revenue");
      const other = otherLines.reduce((sum, line) => add(sum, line.amountCents!), 0) +
        invoice.lines.filter(line => line.lineType === "shipping").reduce((sum, line) => add(sum, line.amountCents!), 0);
      otherExistingBilledCents = add(otherExistingBilledCents, other);
    } else if (repairLines.length && review?.status === "outside-policy") {
      outsidePolicyRepairCents = add(outsidePolicyRepairCents, repairBilled);
      outsidePolicyRepairCount++;
      const otherLines = itemLines.filter(line => line.mappingKey !== "repair-revenue");
      const other = otherLines.reduce((sum, line) => add(sum, line.amountCents!), 0) +
        invoice.lines.filter(line => line.lineType === "shipping").reduce((sum, line) => add(sum, line.amountCents!), 0);
      otherExistingBilledCents = add(otherExistingBilledCents, other);
    } else if (repairLines.length) {
      unallocatedExceptionsCents = add(unallocatedExceptionsCents, repairBilled);
      unallocatedExceptionCount++;
      const otherLines = itemLines.filter(line => line.mappingKey !== "repair-revenue");
      const other = otherLines.reduce((sum, line) => add(sum, line.amountCents!), 0) +
        invoice.lines.filter(line => line.lineType === "shipping").reduce((sum, line) => add(sum, line.amountCents!), 0);
      otherExistingBilledCents = add(otherExistingBilledCents, other);
      if (review) exceptions.push({ sourceId: invoice.sourceId, sourceRevision: invoice.sourceRevision,
        billedRepairCents: repairBilled, reasonCodes: review.reasonCodes });
    } else if (invoice.sourceType === "part-sale-invoice") {
      const sales = itemLines.filter(line => line.mappingKey === "part-sale-item").reduce((sum, line) => {
        assert(line.amountCents !== null, "Direct parts billed line is unavailable", 502);
        return add(sum, line.amountCents);
      }, 0);
      directParts4200Cents = add(directParts4200Cents, sales);
      if (sales > 0) directPartsInvoiceCount++;
      const otherLines = itemLines.filter(line => line.mappingKey !== "part-sale-item");
      const other = otherLines.reduce((sum, line) => add(sum, line.amountCents!), 0) +
        invoice.lines.filter(line => line.lineType === "shipping").reduce((sum, line) => add(sum, line.amountCents!), 0);
      otherExistingBilledCents = add(otherExistingBilledCents, other);
    } else {
      otherExistingBilledCents = add(otherExistingBilledCents,
        invoice.lines.reduce((sum, line) => add(sum, line.amountCents!), 0));
    }
  }
  const bridge = repairParts4210Cents + repairServices4100Cents + contractAdjustmentsCents -
    concessionDeductionsCents + directParts4200Cents + unallocatedExceptionsCents +
    outsidePolicyRepairCents + otherExistingBilledCents;
  assert(Number.isSafeInteger(bridge) && bridge === billedInvoiceCents,
    "Management report bridge does not equal existing billed invoice totals", 502);
  assert(classifiedRepairCount + unallocatedExceptionCount === eligibleRepairInvoiceCount,
    "Eligible repair coverage population is incomplete", 502);
  return {
    companyId: "pioneer-industries", from: input.from, to: input.to,
    allocationScanRevision: input.scan.scanRevision, complete: true,
    billedInvoiceCents, actualBilledRepairNetCents, repairParts4210Cents, repairServices4100Cents, directParts4200Cents,
    contractAdjustmentsCents, concessionDeductionsCents, unallocatedExceptionsCents,
    outsidePolicyRepairCents, otherExistingBilledCents, invoiceCount: selected.length,
    classifiedRepairCount, directPartsInvoiceCount, unallocatedExceptionCount,
    eligibleRepairInvoiceCount, eligibleRepairClassifiedInvoiceCount: classifiedRepairCount,
    unboundExceptionCount: reconciliation.unboundExceptions.length,
    outsidePolicyRepairCount, coveragePercent: eligibleRepairInvoiceCount === 0 ? 100 :
      Math.round(classifiedRepairCount / eligibleRepairInvoiceCount * 10000) / 100,
    exceptions, unboundExceptionRecordIds: reconciliation.unboundExceptions,
    bridgeDifferenceCents: 0,
  };
}

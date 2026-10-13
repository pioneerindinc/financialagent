import { createHash } from "node:crypto";
import { z } from "zod";

// Controlled mirror of ERP's independent pioneer-repair-revenue-allocation-v1 wire contract.
export const ALLOCATION_CONTRACT = "pioneer-repair-revenue-allocation-v1";
export const ALLOCATION_PATH = "/api/integrations/financial-agent/repair-revenue-allocations";
export const ALLOCATION_COMPANY = "pioneer-industries";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.string().trim().min(1).max(180);
const instant = z.iso.datetime({ offset: true });
const cents = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const natural = cents.nonnegative();
const revision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const decimal = z.string().regex(/^(0|[1-9]\d*)(\.\d{1,12})?$/).max(80);

export const allocationConfigSchema = z.object({
  schemaVersion: z.literal(1), companyId: z.literal(ALLOCATION_COMPANY), revision,
  allocationEnabled: z.boolean(), effectiveDate: z.literal("2027-01-01"),
  businessTimeZone: z.literal("America/Indiana/Indianapolis"), policyVersion: z.literal(1),
  approvedBy: id, approvedAt: instant, reason: z.string().trim().min(1).max(500),
}).strict();
const priced = {
  partReference: id, partId: id.nullable(), quantity: decimal,
  exactUnitRate: decimal.nullable(), priceBasis: z.enum(["retained-repair-price", "selected-at-finalization"]),
  priceSource: id, priceCapturedAt: instant.nullable(),
  precision: z.enum(["exact-rate", "recorded-extension-only"]),
  selectedUnitPrice: decimal.nullable().optional(),
  reportingDimension: z.enum(["ordinary", "replacement-bottle"]).optional(),
};
const componentBase = { componentId: hash, evidenceReference: id, amountCents: cents };
export const allocationComponentSchema = z.discriminatedUnion("kind", [
  z.object({ ...componentBase, ...priced, kind: z.literal("repair-parts"),
    amountCents: natural, condition: z.enum(["new", "used"]) }).strict(),
  z.object({ ...componentBase, ...priced, kind: z.literal("labor-services"),
    amountCents: natural, condition: z.literal("service") }).strict(),
  z.object({ ...componentBase, kind: z.literal("contract-pricing-adjustment"), reason: id }).strict(),
  z.object({ ...componentBase, kind: z.literal("concession"), amountCents: cents.max(0),
    concessionType: z.enum(["warranty", "waiver", "other-explicit"]), reason: id,
    authorizedBy: id }).strict(),
]).superRefine((component, ctx) => {
  if ("precision" in component &&
      (component.precision === "exact-rate") !== (component.exactUnitRate !== null))
    ctx.addIssue({ code: "custom", message: "Rate precision mismatch" });
});
const common = {
  schemaVersion: z.literal(2), companyId: z.literal(ALLOCATION_COMPANY),
  operationId: hash, evidenceRevision: revision, finalizationEventId: hash, idempotencyKey: hash,
  shipmentId: id, invoiceIdentity: id, sourceId: hash.nullable(), sourceRevision: hash.nullable(),
  originalFinalizedAt: instant, capturedAt: instant, capturedBy: id,
  config: allocationConfigSchema, environment: z.enum(["development-test", "operational"]),
  sourceLineIds: z.array(id).min(1).max(500), components: z.array(allocationComponentSchema).max(5000),
};
export const allocationEvidenceSchema = z.discriminatedUnion("status", [
  z.object({ ...common, status: z.literal("captured"), sourceId: hash,
    sourceRevision: hash, actualBilledRepairCents: natural }).strict(),
  z.object({ ...common, status: z.literal("exception"), actualBilledRepairCents: natural.nullable(),
    stage: z.enum(["pricing", "classification", "identity", "validation", "capture"]),
    reasonCodes: z.array(id).min(1).max(30), missingFields: z.array(id).max(100) }).strict(),
]).superRefine((e, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (e.operationId !== allocationHash(["repair-allocation-operation-v1", e.companyId,
    e.shipmentId, e.invoiceIdentity])) issue("Operation identity mismatch");
  if (e.finalizationEventId !== allocationHash(["repair-finalization-v1", e.shipmentId,
    e.originalFinalizedAt])) issue("Finalization event mismatch");
  if (e.idempotencyKey !== allocationHash(["repair-allocation-outcome-v2", e.operationId,
    e.finalizationEventId, e.sourceId, e.sourceRevision, e.evidenceRevision])) issue("Idempotency mismatch");
  if (e.sourceId && e.invoiceIdentity !== e.sourceId) issue("Source invoice identity mismatch");
  if (Date.parse(e.capturedAt) < Date.parse(e.originalFinalizedAt) ||
      Date.parse(e.config.approvedAt) > Date.parse(e.originalFinalizedAt) || !e.config.allocationEnabled ||
      indianapolisDate(e.originalFinalizedAt) < e.config.effectiveDate)
    issue("Ineligible finalization evidence");
  if (new Set(e.sourceLineIds).size !== e.sourceLineIds.length ||
      new Set(e.components.map(c => c.componentId)).size !== e.components.length)
    issue("Duplicate source or component identity");
  if (e.status === "captured") {
    const bridge = e.components.reduce((sum, c) => sum + c.amountCents, 0);
    if (!e.components.length || bridge !== e.actualBilledRepairCents)
      issue("Captured evidence is not reconciled");
  }
  if (e.status === "exception" && (!e.sourceId || !e.sourceRevision) &&
      !e.reasonCodes.includes("missing-source-binding")) issue("Unbound exception not explicit");
  for (const c of e.components) if (c.kind === "repair-parts" || c.kind === "labor-services") {
    if (!c.reportingDimension || c.selectedUnitPrice === undefined ||
        (e.status === "captured" && c.selectedUnitPrice === null)) issue("Pricing identity missing");
    if (c.reportingDimension === "replacement-bottle" && c.kind !== "repair-parts")
      issue("Replacement bottle is not repair parts");
  }
});
export type AllocationEvidence = z.infer<typeof allocationEvidenceSchema>;
export const allocationRecordSchema = z.object({
  recordId: z.string().min(1).max(250), supersedesRecordId: z.string().min(1).max(250).nullable(),
  isLatestRevision: z.boolean(), contentHash: hash, evidence: allocationEvidenceSchema,
}).strict().superRefine((record, ctx) => {
  const e = record.evidence;
  if (record.recordId !== `${e.operationId}:evidence:${e.evidenceRevision}` ||
      record.supersedesRecordId !== (e.evidenceRevision === 1 ? null :
        `${e.operationId}:evidence:${e.evidenceRevision - 1}`) ||
      record.contentHash !== allocationHash(e))
    ctx.addIssue({ code: "custom", message: "Evidence envelope mismatch" });
});
export type AllocationRecord = z.infer<typeof allocationRecordSchema>;
export const allocationPageSchema = z.object({
  contract: z.literal(ALLOCATION_CONTRACT), companyId: z.literal(ALLOCATION_COMPANY),
  capturedAt: z.iso.datetime(),
  period: z.object({ from: z.iso.date(), to: z.iso.date(),
    timeBasis: z.literal("UTC-finalization-date") }).strict(),
  sourceConsistency: z.literal("mongo-snapshot-per-request"),
  records: z.array(allocationRecordSchema).max(50),
  pagination: z.object({ total: z.number().int().nonnegative().max(5000),
    limit: z.number().int().min(1).max(50), scanRevision: hash,
    nextCursor: z.string().max(2048).nullable(), complete: z.boolean() }).strict(),
}).strict();

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const allocationHash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export function indianapolisDate(stamp: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Indiana/Indianapolis",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(stamp));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { ArInvoice, ArVersion, ArMapping, Audit, Journal, Company } from "../src/models";
import { simulateImportedAllocationWindow } from "../src/domains/repair-allocation/simulation";
import { getAllocationManagementReport } from "../src/domains/repair-allocation/management-report";
import { allocationHash } from "../src/domains/repair-allocation/contract";
import type { Actor } from "../src/lib/auth/policy";
import { invoice } from "./ar-fixtures";

const companyId = "pioneer-industries";
const actor: Actor = { id: "phase5-fixture-reviewer", kind: "human", companies: [companyId],
  scopes: ["finance:read"] };
let replica: MongoMemoryReplSet;
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, name: "phase5-fixture" },
    binary: { version: "8.0.12" } });
  const uri = replica.getUri("phase5_fixture");
  const parsed = new URL(uri);
  expect(parsed.hostname).toBe("127.0.0.1");
  expect(parsed.pathname).toBe("/phase5_fixture");
  vi.stubEnv("MONGODB_URI", uri);
  vi.stubEnv("PIONEER_AR_COMPANY_ID", companyId);
  vi.stubEnv("PIONEER_ERP_BASE_URL", "https://erp-fixture.example/");
  vi.stubEnv("FINANCIAL_AGENT_API_KEY", "isolated-phase5-credential");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  expect((await mongoose.connection.db!.admin().command({ hello: 1 })).setName).toBe("phase5-fixture");
  expect(mongoose.connection.db!.databaseName).toBe("phase5_fixture");
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
  vi.unstubAllEnvs();
});

it("reads imported projections without changing invoices, versions, mappings, journals, audits or company lock", async () => {
  const full = invoice({ issuedAt: "2027-01-15T12:00:00.000Z" });
  const { context: ignored, ...retained } = full;
  void ignored;
  await Company.create({ _id: companyId, name: "Pioneer fixture", createdBy: "fixture",
    updatedBy: "fixture", lockVersion: 7 });
  await ArVersion.create({ _id: "fixture-version", companyId, invoiceId: "fixture-head",
    sourceRevision: full.sourceRevision, payload: retained, originalAmountCents: 10500,
    mode: "parallel", status: "needs-review", createdBy: "fixture", updatedBy: "fixture" });
  await ArInvoice.create({ _id: "fixture-head", companyId, sourceSystem: "pioneer-erp",
    sourceType: "repair-invoice", sourceId: full.sourceId, currentVersionId: "fixture-version",
    createdBy: "fixture", updatedBy: "fixture" });
  const counts = async () => Promise.all([ArInvoice.countDocuments(), ArVersion.countDocuments(),
    ArMapping.countDocuments(), Journal.countDocuments(), Audit.countDocuments()]);
  const before = await counts();
  const companyBefore = await Company.findById(companyId).lean();
  const page = { contract: "pioneer-repair-revenue-allocation-v1", companyId,
    capturedAt: "2027-01-15T12:00:00.000Z", period: { from: "2027-01-01", to: "2027-01-31",
      timeBasis: "UTC-finalization-date" }, sourceConsistency: "mongo-snapshot-per-request",
    records: [], pagination: { total: 0, limit: 1, scanRevision: allocationHash([]),
      nextCursor: null, complete: true } };
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page));
  const result = await simulateImportedAllocationWindow(actor, companyId,
    { from: "2027-01-01", to: "2027-01-31", limit: 1 }, fetcher);
  expect(result.reviews).toMatchObject([{ status: "missing-evidence", billedRepairCents: 10000 }]);
  expect(await counts()).toEqual(before);
  expect(await Company.findById(companyId).lean()).toEqual(companyBefore);
  expect(await ArVersion.findById("fixture-version").lean()).toMatchObject({
    sourceRevision: full.sourceRevision, originalAmountCents: 10500, mode: "parallel" });
  fetcher.mockResolvedValue(Response.json({ ...page, period: { from: "2027-01-15", to: "2027-01-16",
    timeBasis: "UTC-finalization-date" } }));
  const report = await getAllocationManagementReport(actor, companyId,
    { from: "2027-01-15", to: "2027-01-15", limit: 1 }, fetcher);
  expect(report).toMatchObject({ billedInvoiceCents: 10500, unallocatedExceptionsCents: 10000,
    otherExistingBilledCents: 500, bridgeDifferenceCents: 0 });
  expect(await counts()).toEqual(before);
  expect(await Company.findById(companyId).lean()).toEqual(companyBefore);
  await expect(simulateImportedAllocationWindow({ ...actor, scopes: [] }, companyId,
    { from: "2027-01-01", to: "2027-01-31", limit: 1 }, fetcher)).rejects.toMatchObject({ status: 403 });
  await expect(simulateImportedAllocationWindow(actor, "317-graphics",
    { from: "2027-01-01", to: "2027-01-31", limit: 1 }, fetcher)).rejects.toMatchObject({ status: 403 });
  await expect(getAllocationManagementReport({ ...actor, scopes: [] }, companyId,
    { from: "2027-01-15", to: "2027-01-15", limit: 1 }, fetcher)).rejects.toMatchObject({ status: 403 });
  await expect(getAllocationManagementReport(actor, "317-graphics",
    { from: "2027-01-15", to: "2027-01-15", limit: 1 }, fetcher)).rejects.toMatchObject({ status: 403 });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

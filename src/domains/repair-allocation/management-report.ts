import "server-only";
import mongoose from "mongoose";
import { z } from "zod";
import { ArInvoice, ArVersion } from "../../models";
import { PIONEER_COMPANY } from "../../lib/accounting-cutover";
import { authorize, type Actor } from "../../lib/auth/policy";
import { connect } from "../../lib/db";
import { assert } from "../../lib/errors";
import { arCompany } from "../ar/config";
import { retainedInvoiceSchema } from "../ar/contract";
import { allocationScanQuery, scanAllocationEvidence } from "./client";
import { indianapolisDate } from "./contract";
import { buildAllocationManagementReport } from "./report";

const querySchema = z.object({ from: z.iso.date(), to: z.iso.date(), limit: z.number().int().min(1).max(50).default(25) })
  .strict().refine(q => q.from <= q.to && (Date.parse(q.to) - Date.parse(q.from)) / 86400000 < 365,
    "Use a complete Indianapolis-local window of at most 365 inclusive dates");
function plusDay(value: string) {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + 86400000).toISOString().slice(0, 10);
}

/** On-demand read-only Phase 6 report. Scan and projection failures reject the whole report. */
export async function getAllocationManagementReport(actor: Actor, companyId: string, input: unknown,
  fetcher: typeof fetch = fetch) {
  authorize(actor, companyId, "finance:read");
  assert(companyId === PIONEER_COMPANY && companyId === arCompany(),
    "ERP allocation company is not bound to this Financial Agent company", 403);
  const query = querySchema.parse(input);
  const scanWindow = allocationScanQuery.parse({ from: query.from, to: plusDay(query.to), limit: query.limit });
  const scan = await scanAllocationEvidence(scanWindow, fetcher);
  await connect();
  const session = await mongoose.startSession();
  try {
    session.startTransaction({ readConcern: { level: "snapshot" } });
    const heads = await ArInvoice.find({ companyId, sourceSystem: "pioneer-erp" })
      .select("_id sourceId currentVersionId").lean().session(session);
    assert(heads.length <= 5000, "Imported invoice read bound exceeded", 413);
    const versions = await ArVersion.find({ companyId,
      _id: { $in: heads.map(head => head.currentVersionId).filter(Boolean) } })
      .select("_id payload").lean().session(session);
    const byId = new Map(versions.map(version => [String(version._id), version]));
    const invoices = heads.map(head => {
      const version = byId.get(String(head.currentVersionId));
      assert(version, "Imported invoice is missing its current version", 409);
      const invoice = retainedInvoiceSchema.parse(version.payload);
      assert(invoice.sourceId === head.sourceId, "Imported invoice identity mismatch", 409);
      return invoice;
    });
    // A missing finalization timestamp prevents proving whether that invoice belongs
    // inside or outside the requested finalized-date range. Fail closed rather than
    // silently excluding it or substituting invoiceDate.
    for (const invoice of invoices) {
      assert(invoice.issuedAt, "Invoice finalization timestamp unavailable; report period completeness cannot be established", 502);
    }
    const selected = invoices.filter(invoice => {
      const date = indianapolisDate(invoice.issuedAt!);
      return date >= query.from && date <= query.to;
    });
    const report = buildAllocationManagementReport({ scan, invoices: selected, from: query.from, to: query.to });
    await session.commitTransaction();
    return report;
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally { await session.endSession(); }
}

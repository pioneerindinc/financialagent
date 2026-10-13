import "server-only";
import mongoose from "mongoose";
import { ArInvoice, ArVersion } from "../../models";
import { PIONEER_COMPANY } from "../../lib/accounting-cutover";
import { authorize, type Actor } from "../../lib/auth/policy";
import { connect } from "../../lib/db";
import { assert } from "../../lib/errors";
import { arCompany } from "../ar/config";
import { retainedInvoiceSchema } from "../ar/contract";
import { scanAllocationEvidence } from "./client";
import { reconcileAllocationScan } from "./reconcile";

/** Read-only Phase 5 simulation. No allocation collection, import service or accounting writes. */
export async function simulateImportedAllocationWindow(actor: Actor, companyId: string,
  query: unknown, fetcher: typeof fetch = fetch) {
  authorize(actor, companyId, "finance:read");
  assert(companyId === PIONEER_COMPANY && companyId === arCompany(),
    "ERP allocation company is not bound to this Financial Agent company", 403);
  const scan = await scanAllocationEvidence(query, fetcher);
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
    }).filter(invoice => {
      const candidateDate = invoice.issuedAt
        ? new Date(invoice.issuedAt).toISOString().slice(0, 10)
        : invoice.invoiceDate;
      return candidateDate !== null && candidateDate >= scan.from && candidateDate <= scan.to;
    });
    const result = reconcileAllocationScan(scan, invoices);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally { await session.endSession(); }
}

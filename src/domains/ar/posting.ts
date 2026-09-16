import "server-only";
import type { ClientSession } from "mongoose";
import { ArInvoice, ArVersion, ArMapping } from "../../models";
import { assert } from "../../lib/errors";
import { arCompany, authoritativeEnabled } from "./config";
import { mappingSchema, validateMappingAccounts } from "./mapping";

export async function assertArPosting(
  journal: {
    _id: unknown;
    sourceSystem: string;
    sourceType: string;
    arVersionId?: string;
    transactionDate: string;
  },
  companyId: string,
  session: ClientSession,
) {
  if (!isArSource(journal) && !journal.arVersionId) return;
  assert(
    journal.arVersionId && companyId === arCompany() && authoritativeEnabled(),
    "Authoritative AR posting is not enabled",
    409,
  );
  const version = await ArVersion.findOne({
    _id: journal.arVersionId,
    companyId,
    mode: "authoritative",
    status: "drafted",
    journalId: String(journal._id),
  }).session(session);
  assert(
    version && journal.transactionDate >= "2027-01-01",
    "AR source revision is not eligible for posting",
    409,
  );
  assert(
    await ArInvoice.exists({
      _id: version.invoiceId,
      companyId,
      currentVersionId: version.id,
    }).session(session),
    "AR source revision was superseded",
    409,
  );
  const mapping = await ArMapping.findOne({ companyId })
    .sort({ version: -1 })
    .session(session);
  assert(
    mapping && mapping.version === version.mappingVersion,
    "AR mapping changed; rebuild and review the source draft",
    409,
  );
  await validateMappingAccounts(
    companyId,
    mappingSchema.parse({
      arAccountId: mapping.arAccountId,
      rules: mapping.rules,
    }),
    session,
  );
}
export function isArSource(record: {
  sourceSystem: string;
  sourceType: string;
}) {
  return (
    record.sourceSystem === "pioneer-erp" &&
    ["repair-invoice", "part-sale-invoice", "standalone-invoice"].includes(
      record.sourceType,
    )
  );
}

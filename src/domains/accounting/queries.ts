import { authorize, type Actor } from "../../lib/auth/policy";
import { connect } from "../../lib/db";
import { assert } from "../../lib/errors";
import { Journal } from "../../models";
import { id } from "./validation";
export async function getJournal(
  actor: Actor,
  companyId: string,
  journalId: string,
) {
  authorize(actor, companyId);
  id.parse(journalId);
  await connect();
  const journal = await Journal.findOne({ companyId, _id: journalId }).lean();
  assert(journal, "Journal not found", 404);
  const reversal = await Journal.findOne({
    companyId,
    reversalOf: journalId,
    status: "posted",
  })
    .select("_id")
    .lean();
  return {
    ...journal,
    reversedBy: reversal ? String(reversal._id) : undefined,
  };
}

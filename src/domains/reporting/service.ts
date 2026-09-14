import { authorize, type Actor } from "../../lib/auth/policy";
import { connect } from "../../lib/db";
import { Account, Company, Journal, Period } from "../../models";
import { date } from "../accounting/validation";
import { add, subtract } from "../../lib/money";
import { assert } from "../../lib/errors";
export async function overview(actor: Actor, companyId: string) {
  authorize(actor, companyId);
  await connect();
  const company = await Company.findOne({ _id: companyId });
  assert(company, "Company not found", 404);
  const accounts = await Account.find({ companyId }).sort({ code: 1 });
  const periods = await Period.find({ companyId }).sort({ startDate: -1 });
  const journals = await Journal.find({ companyId })
    .sort({ createdAt: -1 })
    .limit(100);
  const postedCount = await Journal.countDocuments({
    companyId,
    status: "posted",
  });
  const draftCount = await Journal.countDocuments({
    companyId,
    status: "draft",
  });
  return { company, accounts, periods, journals, postedCount, draftCount };
}
export async function trialBalance(
  actor: Actor,
  companyId: string,
  asOf: string,
) {
  authorize(actor, companyId);
  date.parse(asOf);
  await connect();
  // Checked integer arithmetic; never use floating-point dollar aggregates.
  const db = await connect();
  const { entries, accounts } = await db.connection.transaction(
    async (session) => {
      const entries = await Journal.find({
        companyId,
        status: "posted",
        transactionDate: { $lte: asOf },
      })
        .session(session)
        .lean();
      const accounts = await Account.find({ companyId })
        .sort({ code: 1 })
        .session(session)
        .lean();
      return { entries, accounts };
    },
    { readConcern: { level: "snapshot" } },
  );
  const balances = new Map<string, number>();
  for (const entry of entries)
    for (const line of entry.lines)
      balances.set(
        line.accountId,
        add(
          balances.get(line.accountId) || 0,
          subtract(line.debitCents, line.creditCents),
        ),
      );
  const rows = accounts.map((a) => {
    const netCents = balances.get(String(a._id)) || 0;
    return {
      accountId: String(a._id),
      code: a.code,
      name: a.name,
      netCents,
      debitCents: Math.max(netCents, 0),
      creditCents: Math.max(-netCents, 0),
    };
  });
  return {
    companyId,
    asOf,
    rows,
    debitCents: rows.reduce((n, r) => add(n, r.debitCents), 0),
    creditCents: rows.reduce((n, r) => add(n, r.creditCents), 0),
  };
}
export async function generalLedger(
  actor: Actor,
  companyId: string,
  from: string,
  to: string,
  accountId?: string,
) {
  authorize(actor, companyId);
  date.parse(from);
  date.parse(to);
  assert(from <= to, "Invalid date range");
  await connect();
  if (accountId)
    assert(
      await Account.exists({ companyId, _id: accountId }),
      "Account not found",
      404,
    );
  const db = await connect();
  const entries = await db.connection.transaction(
    async (session) =>
      Journal.find({
        companyId,
        status: "posted",
        transactionDate: { $lte: to },
        ...(accountId ? { "lines.accountId": accountId } : {}),
      })
        .sort({ transactionDate: 1, createdAt: 1, _id: 1 })
        .session(session)
        .lean(),
    { readConcern: { level: "snapshot" } },
  );
  const balances = new Map<string, number>();
  const rows = [];
  for (const e of entries)
    for (const l of e.lines) {
      if (accountId && l.accountId !== accountId) continue;
      const balance = add(
        balances.get(l.accountId) || 0,
        subtract(l.debitCents, l.creditCents),
      );
      balances.set(l.accountId, balance);
      if (e.transactionDate >= from)
        rows.push({
          transactionDate: e.transactionDate,
          journalId: String(e._id),
          description: e.description,
          accountId: l.accountId,
          debitCents: l.debitCents,
          creditCents: l.creditCents,
          runningBalanceCents: balance,
          sourceSystem: e.sourceSystem,
          sourceType: e.sourceType,
          sourceId: e.sourceId,
          sourceRevision: e.sourceRevision,
        });
    }
  return { companyId, from, to, rows };
}

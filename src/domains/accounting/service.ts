import { createHash, randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { z } from "zod";
import { connect } from "../../lib/db";
import { assert } from "../../lib/errors";
import { authorize, type Actor } from "../../lib/auth/policy";
import { Account, Audit, Company, Journal, Period } from "../../models";
import {
  accountSchema,
  date,
  id,
  periodSchema,
  text,
  validateJournal,
} from "./validation";
const actorId = (actor: Actor) => `${actor.kind}:${actor.id}`;
const hash = (data: unknown) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
async function write<T>(
  actor: Actor,
  companyId: string,
  scope: string,
  work: (session: ClientSession) => Promise<T>,
) {
  id.parse(companyId);
  authorize(actor, companyId, scope);
  const db = await connect();
  return db.connection.transaction(
    async (session) => {
      // Serialize all company writes: posting and period closure cannot race.
      const company = await Company.findOneAndUpdate(
        { _id: companyId, status: "active" },
        { $inc: { lockVersion: 1 } },
        { session },
      );
      assert(company, "Active company not found", 404);
      return work(session);
    },
    {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
    },
  );
}
async function audit(
  session: ClientSession,
  actor: Actor,
  companyId: string,
  action: string,
  entityId: string,
  reason: string,
  before?: unknown,
  after?: unknown,
) {
  await Audit.create(
    [
      {
        _id: randomUUID(),
        companyId,
        action,
        entityId,
        reason,
        before,
        after,
        createdBy: actorId(actor),
        updatedBy: actorId(actor),
      },
    ],
    { session },
  );
}
async function accountsValid(
  companyId: string,
  lines: { accountId: string }[],
  session: ClientSession,
) {
  const ids = [...new Set(lines.map((l) => l.accountId))];
  const count = await Account.countDocuments({
    companyId,
    _id: { $in: ids },
    active: true,
  }).session(session);
  assert(
    count === ids.length,
    "Every account must be active and belong to this company",
  );
}
async function openPeriod(
  companyId: string,
  transactionDate: string,
  session: ClientSession,
) {
  const period = await Period.findOne({
    companyId,
    startDate: { $lte: transactionDate },
    endDate: { $gte: transactionDate },
    status: "open",
  }).session(session);
  assert(period, "Transaction date requires an open accounting period");
}
export async function createAccount(
  actor: Actor,
  companyId: string,
  input: unknown,
) {
  const data = accountSchema.parse(input);
  return write(actor, companyId, "finance:write", async (session) => {
    if (data.parentId)
      assert(
        await Account.exists({
          companyId,
          _id: data.parentId,
          type: data.type,
        }).session(session),
        "Parent must belong to company and have same type",
      );
    const [record] = await Account.create(
      [
        {
          _id: randomUUID(),
          companyId,
          ...data,
          createdBy: actorId(actor),
          updatedBy: actorId(actor),
        },
      ],
      { session },
    );
    await audit(
      session,
      actor,
      companyId,
      "account.create",
      record.id,
      data.name,
      undefined,
      record.toObject(),
    );
    return record;
  });
}
export async function createPeriod(
  actor: Actor,
  companyId: string,
  input: unknown,
) {
  const data = periodSchema.parse(input);
  return write(actor, companyId, "finance:write", async (session) => {
    assert(
      !(await Period.exists({
        companyId,
        startDate: { $lte: data.endDate },
        endDate: { $gte: data.startDate },
      }).session(session)),
      "Accounting periods cannot overlap",
    );
    const [record] = await Period.create(
      [
        {
          _id: randomUUID(),
          companyId,
          ...data,
          createdBy: actorId(actor),
          updatedBy: actorId(actor),
        },
      ],
      { session },
    );
    await audit(
      session,
      actor,
      companyId,
      "period.create",
      record.id,
      "Create accounting period",
      undefined,
      record.toObject(),
    );
    return record;
  });
}
export async function closePeriod(
  actor: Actor,
  companyId: string,
  periodId: string,
  reason: string,
) {
  text.parse(reason);
  return write(actor, companyId, "finance:write", async (session) => {
    const record = await Period.findOneAndUpdate(
      { _id: periodId, companyId, status: "open" },
      {
        $set: {
          status: "closed",
          closedAt: new Date(),
          closedBy: actorId(actor),
          updatedBy: actorId(actor),
        },
      },
      { session, returnDocument: "after" },
    );
    assert(record, "Open period not found", 409);
    await audit(session, actor, companyId, "period.close", record.id, reason);
    return record;
  });
}
export async function createDraft(
  actor: Actor,
  companyId: string,
  input: unknown,
) {
  const data = validateJournal(input);
  assert(
    data.sourceSystem !== "financialagent-reversal",
    "Reserved source system",
  );
  return write(
    actor,
    companyId,
    actor.kind === "service" ? "finance:source:write" : "finance:write",
    async (session) => {
      const existing = await Journal.findOne({
        companyId,
        sourceSystem: data.sourceSystem,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        sourceRevision: data.sourceRevision,
      }).session(session);
      if (existing) {
        assert(
          existing.sourceHash === hash(data),
          "Source identity already exists with different content",
          409,
        );
        return existing;
      }
      await accountsValid(companyId, data.lines, session);
      const [record] = await Journal.create(
        [
          {
            _id: randomUUID(),
            companyId,
            ...data,
            sourceHash: hash(data),
            createdBy: actorId(actor),
            updatedBy: actorId(actor),
          },
        ],
        { session },
      );
      await audit(
        session,
        actor,
        companyId,
        "journal.create",
        record.id,
        data.description,
        undefined,
        record.toObject(),
      );
      return record;
    },
  );
}
export async function editDraft(
  actor: Actor,
  companyId: string,
  journalId: string,
  input: unknown,
  revision: number,
) {
  const data = validateJournal(input);
  z.number().int().nonnegative().parse(revision);
  return write(actor, companyId, "finance:write", async (session) => {
    const record = await Journal.findOne({
      _id: journalId,
      companyId,
      status: "draft",
      revision,
    }).session(session);
    assert(record, "Draft missing or changed; reload before editing", 409);
    assert(
      record.sourceSystem === "manual",
      "Imported drafts require a new source revision",
    );
    for (const key of [
      "sourceSystem",
      "sourceType",
      "sourceId",
      "sourceRevision",
    ] as const)
      assert(record[key] === data[key], "Source identity is immutable");
    await accountsValid(companyId, data.lines, session);
    const before = record.toObject();
    Object.assign(record, data, {
      revision: revision + 1,
      updatedBy: actorId(actor),
    });
    await record.save({ session });
    await audit(
      session,
      actor,
      companyId,
      "journal.edit",
      record.id,
      data.description,
      before,
      record.toObject(),
    );
    return record;
  });
}
export async function postJournal(
  actor: Actor,
  companyId: string,
  journalId: string,
  revision: number,
) {
  z.number().int().nonnegative().parse(revision);
  return write(actor, companyId, "finance:write", async (session) => {
    const record = await Journal.findOne({ _id: journalId, companyId }).session(
      session,
    );
    assert(record, "Journal not found", 404);
    if (record.status === "posted") return record;
    assert(
      record.revision === revision,
      "Draft changed; review before posting",
      409,
    );
    validateJournal({
      transactionDate: record.transactionDate,
      description: record.description,
      sourceSystem: record.sourceSystem,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      sourceRevision: record.sourceRevision,
      lines: record.lines.map((l: { toObject(): unknown }) => l.toObject()),
    });
    await accountsValid(companyId, record.lines, session);
    await openPeriod(companyId, record.transactionDate, session);
    Object.assign(record, {
      status: "posted",
      postedAt: new Date(),
      postingDate: new Date().toISOString().slice(0, 10),
      postedBy: actorId(actor),
      updatedBy: actorId(actor),
    });
    await record.save({ session });
    await audit(
      session,
      actor,
      companyId,
      "journal.post",
      record.id,
      record.description,
    );
    return record;
  });
}
export async function reverseJournal(
  actor: Actor,
  companyId: string,
  journalId: string,
  transactionDate: string,
  reason: string,
) {
  date.parse(transactionDate);
  text.parse(reason);
  return write(actor, companyId, "finance:write", async (session) => {
    const original = await Journal.findOne({
      _id: journalId,
      companyId,
      status: "posted",
    }).session(session);
    assert(original, "Posted journal not found", 404);
    assert(!original.reversalOf, "Reversal entries cannot be reversed");
    assert(
      !(await Journal.exists({ companyId, reversalOf: journalId }).session(
        session,
      )),
      "Journal already reversed",
      409,
    );
    await openPeriod(companyId, transactionDate, session);
    const lines = original.lines.map(
      (l: {
        accountId: string;
        debitCents: number;
        creditCents: number;
        memo: string;
      }) => ({
        accountId: l.accountId,
        debitCents: l.creditCents,
        creditCents: l.debitCents,
        memo: l.memo,
      }),
    );
    const data = validateJournal({
      transactionDate,
      description: reason,
      sourceSystem: "financialagent-reversal",
      sourceType: "journal",
      sourceId: journalId,
      sourceRevision: "1",
      lines,
    });
    const [record] = await Journal.create(
      [
        {
          _id: randomUUID(),
          companyId,
          ...data,
          sourceHash: hash(data),
          reversalOf: journalId,
          status: "posted",
          postedAt: new Date(),
          postingDate: new Date().toISOString().slice(0, 10),
          postedBy: actorId(actor),
          createdBy: actorId(actor),
          updatedBy: actorId(actor),
        },
      ],
      { session },
    );
    await audit(
      session,
      actor,
      companyId,
      "journal.reverse",
      record.id,
      reason,
      { originalId: journalId },
      record.toObject(),
    );
    return record;
  });
}

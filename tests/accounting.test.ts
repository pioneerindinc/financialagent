import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { bootstrap } from "../src/domains/companies/bootstrap";
import {
  createAccount,
  createDraft,
  createPeriod,
  closePeriod,
  editDraft,
  postJournal,
  reverseJournal,
} from "../src/domains/accounting/service";
import {
  trialBalance,
  generalLedger,
  overview,
} from "../src/domains/reporting/service";
import { Company, Journal, Account, Period, Audit } from "../src/models";
import type { Actor } from "../src/lib/auth/policy";
const company = "pioneer-industries";
const other = "317-graphics";
const human: Actor = {
  id: "test-accountant",
  kind: "human",
  companies: [company, other],
  scopes: ["finance:read", "finance:write"],
};
let replica: MongoMemoryReplSet;
let debit: string;
let credit: string;
let period: string;
function draft(overrides = {}) {
  return {
    transactionDate: "2026-01-15",
    description: "Test entry",
    sourceSystem: "manual",
    sourceType: "journal",
    sourceId: randomUUID(),
    sourceRevision: "1",
    lines: [
      { accountId: debit, debitCents: 12500, creditCents: 0, memo: "" },
      { accountId: credit, debitCents: 0, creditCents: 12500, memo: "" },
    ],
    ...overrides,
  };
}
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "8.0.12" },
  });
  process.env.MONGODB_URI = replica.getUri("financialagent_test");
  await bootstrap("test");
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
});
beforeEach(async () => {
  await Promise.all([
    Account.deleteMany({}),
    Journal.deleteMany({}),
    Period.deleteMany({}),
    Audit.deleteMany({}),
  ]);
  debit = (
    await createAccount(human, company, {
      code: "1000",
      name: "Cash",
      type: "Asset",
    })
  ).id;
  credit = (
    await createAccount(human, company, {
      code: "3000",
      name: "Equity",
      type: "Equity",
    })
  ).id;
  period = (
    await createPeriod(human, company, {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    })
  ).id;
});
describe("durable accounting core", () => {
  it("bootstraps four companies without changing stable IDs or existing settings", async () => {
    await Company.updateOne(
      { _id: company },
      { $set: { shortName: "Custom" } },
    );
    await bootstrap("again");
    expect(await Company.countDocuments()).toBe(4);
    expect((await Company.findById(company)).shortName).toBe("Custom");
  });
  it("creates an attributed company account", async () => {
    const a = await Account.findById(debit);
    expect(a.companyId).toBe(company);
    expect(a.createdBy).toBe("human:test-accountant");
  });
  it("rejects duplicate account codes within company", async () => {
    await expect(
      createAccount(human, company, {
        code: "1000",
        name: "Duplicate",
        type: "Asset",
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });
  it("permits the same code in different companies", async () => {
    expect(
      (
        await createAccount(human, other, {
          code: "1000",
          name: "Other cash",
          type: "Asset",
        })
      ).companyId,
    ).toBe(other);
  });
  it("rejects cross-company parent account", async () => {
    await expect(
      createAccount(human, other, {
        code: "1001",
        name: "Bad parent",
        type: "Asset",
        parentId: debit,
      }),
    ).rejects.toThrow("Parent");
  });
  it("creates balanced draft", async () => {
    expect((await createDraft(human, company, draft())).status).toBe("draft");
  });
  it("rejects unbalanced journal", async () => {
    const d = draft();
    d.lines[1].creditCents--;
    await expect(createDraft(human, company, d)).rejects.toThrow("balance");
  });
  it("rejects both-positive line", async () => {
    const d = draft();
    d.lines[0].creditCents = 1;
    await expect(createDraft(human, company, d)).rejects.toThrow(
      "one positive",
    );
  });
  it("rejects zero-sided line", async () => {
    const d = draft();
    d.lines[0].debitCents = 0;
    await expect(createDraft(human, company, d)).rejects.toThrow(
      "one positive",
    );
  });
  it("rejects a journal with only one line", async () => {
    const d = draft();
    d.lines.pop();
    await expect(createDraft(human, company, d)).rejects.toThrow();
  });
  it("rejects cross-company lines", async () => {
    await expect(createDraft(human, other, draft())).rejects.toThrow("belong");
  });
  it("rejects inactive accounts", async () => {
    await Account.updateOne({ _id: debit }, { $set: { active: false } });
    await expect(createDraft(human, company, draft())).rejects.toThrow(
      "active",
    );
  });
  it("allows draft editing and records before/after audit", async () => {
    const d = draft();
    const j = await createDraft(human, company, d);
    const updated = await editDraft(
      human,
      company,
      j.id,
      { ...d, description: "Updated" },
      0,
    );
    expect(updated.revision).toBe(1);
    expect(
      (await Audit.findOne({ action: "journal.edit" })).before.description,
    ).toBe("Test entry");
  });
  it("rejects stale draft editing", async () => {
    const d = draft();
    const j = await createDraft(human, company, d);
    await editDraft(human, company, j.id, d, 0);
    await expect(editDraft(human, company, j.id, d, 0)).rejects.toThrow(
      "changed",
    );
  });
  it("rejects posting an unreviewed revision", async () => {
    const d = draft();
    const j = await createDraft(human, company, d);
    await editDraft(human, company, j.id, d, 0);
    await expect(postJournal(human, company, j.id, 0)).rejects.toThrow(
      "changed",
    );
  });
  it("makes posted journals immutable", async () => {
    const d = draft();
    const j = await createDraft(human, company, d);
    await postJournal(human, company, j.id, 0);
    await expect(editDraft(human, company, j.id, d, 0)).rejects.toThrow();
  });
  it("posting retries do not duplicate a journal or posting audit", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    await postJournal(human, company, j.id, 0);
    expect(await Journal.countDocuments()).toBe(1);
    expect(await Audit.countDocuments({ action: "journal.post" })).toBe(1);
  });
  it("blocks closed-period posting", async () => {
    const j = await createDraft(human, company, draft());
    await closePeriod(human, company, period, "Month complete");
    await expect(postJournal(human, company, j.id, 0)).rejects.toThrow(
      "open accounting period",
    );
  });
  it("blocks posting without a period", async () => {
    const j = await createDraft(
      human,
      company,
      draft({ transactionDate: "2026-02-01" }),
    );
    await expect(postJournal(human, company, j.id, 0)).rejects.toThrow(
      "open accounting period",
    );
  });
  it("rejects overlapping periods", async () => {
    await expect(
      createPeriod(human, company, {
        startDate: "2026-01-31",
        endDate: "2026-02-28",
      }),
    ).rejects.toThrow("overlap");
  });
  it("rejects invalid calendar dates", async () => {
    await expect(
      createDraft(human, company, draft({ transactionDate: "2026-02-30" })),
    ).rejects.toThrow();
  });
  it("reverses equal/opposite without modifying original", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    const original = (await Journal.findById(j.id)).toObject();
    const r = await reverseJournal(
      human,
      company,
      j.id,
      "2026-01-20",
      "Correction",
    );
    expect(r.lines[0].creditCents).toBe(12500);
    expect(r.lines[1].debitCents).toBe(12500);
    expect(r.reversalOf).toBe(j.id);
    expect((await Journal.findById(j.id)).toObject()).toEqual(original);
  });
  it("rejects repeated reversal", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    await reverseJournal(human, company, j.id, "2026-01-20", "Correction");
    await expect(
      reverseJournal(human, company, j.id, "2026-01-20", "Again"),
    ).rejects.toThrow("already reversed");
  });
  it("rejects reversing a reversal", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    const r = await reverseJournal(
      human,
      company,
      j.id,
      "2026-01-20",
      "Correction",
    );
    await expect(
      reverseJournal(human, company, r.id, "2026-01-20", "Again"),
    ).rejects.toThrow("cannot be reversed");
  });
  it("reverses a closed-period original in a new open period", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    await closePeriod(human, company, period, "Close");
    await createPeriod(human, company, {
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    expect(
      (await reverseJournal(human, company, j.id, "2026-02-01", "Correction"))
        .status,
    ).toBe("posted");
  });
  it("rejects reversal into closed period", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    await closePeriod(human, company, period, "Close");
    await expect(
      reverseJournal(human, company, j.id, "2026-01-20", "Correction"),
    ).rejects.toThrow("open accounting period");
  });
  it("deduplicates concurrent source delivery", async () => {
    const d = draft();
    const [a, b] = await Promise.all([
      createDraft(human, company, d),
      createDraft(human, company, d),
    ]);
    expect(a.id).toBe(b.id);
    expect(await Journal.countDocuments()).toBe(1);
  });
  it("rejects same source identity with changed payload", async () => {
    const d = draft();
    await createDraft(human, company, d);
    await expect(
      createDraft(human, company, { ...d, description: "Different" }),
    ).rejects.toThrow("different content");
  });
  it("duplicate delivery after posting returns original", async () => {
    const d = draft();
    const j = await createDraft(human, company, d);
    await postJournal(human, company, j.id, 0);
    expect((await createDraft(human, company, d)).status).toBe("posted");
    expect(await Journal.countDocuments()).toBe(1);
  });
  it("excludes drafts from trial balance", async () => {
    await createDraft(human, company, draft());
    expect((await trialBalance(human, company, "2026-01-31")).debitCents).toBe(
      0,
    );
  });
  it("trial balance balances after posting", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    const tb = await trialBalance(human, company, "2026-01-31");
    expect(tb.debitCents).toBe(12500);
    expect(tb.creditCents).toBe(12500);
  });
  it("trial balance respects as-of date and reversal date", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    await reverseJournal(human, company, j.id, "2026-01-20", "Correction");
    expect((await trialBalance(human, company, "2026-01-19")).debitCents).toBe(
      12500,
    );
    expect((await trialBalance(human, company, "2026-01-31")).debitCents).toBe(
      0,
    );
  });
  it("general ledger filters dates and carries opening balance", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    await reverseJournal(human, company, j.id, "2026-01-20", "Correction");
    const gl = await generalLedger(
      human,
      company,
      "2026-01-20",
      "2026-01-31",
      debit,
    );
    expect(gl.rows).toHaveLength(1);
    expect(gl.rows[0].runningBalanceCents).toBe(0);
  });
  it("isolates company reports and journals", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    expect((await overview(human, other)).journals).toHaveLength(0);
    expect((await trialBalance(human, other, "2026-01-31")).rows).toHaveLength(
      0,
    );
    expect(
      (await generalLedger(human, other, "2026-01-01", "2026-01-31")).rows,
    ).toHaveLength(0);
    await expect(postJournal(human, other, j.id, 0)).rejects.toThrow(
      "not found",
    );
  });
  it("rejects company authorization before accessing books", async () => {
    await expect(
      overview({ ...human, companies: [other] }, company),
    ).rejects.toThrow("access denied");
  });
  it("service can create draft but cannot post", async () => {
    const service: Actor = {
      ...human,
      kind: "service",
      scopes: ["finance:source:write", "finance:read"],
    };
    const j = await createDraft(
      service,
      company,
      draft({ sourceSystem: "erp-test" }),
    );
    expect(j.createdBy).toContain("service:");
    await expect(postJournal(service, company, j.id, 0)).rejects.toThrow(
      "Permission denied",
    );
  });
  it("read-only human cannot write", async () => {
    await expect(
      createDraft({ ...human, scopes: ["finance:read"] }, company, draft()),
    ).rejects.toThrow("Permission denied");
  });
  it("concurrent reversals create only one opposite journal", async () => {
    const j = await createDraft(human, company, draft());
    await postJournal(human, company, j.id, 0);
    const results = await Promise.allSettled([
      reverseJournal(human, company, j.id, "2026-01-20", "One"),
      reverseJournal(human, company, j.id, "2026-01-20", "Two"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await Journal.countDocuments({ reversalOf: j.id })).toBe(1);
  });
  it("period closure and posting are serialized", async () => {
    const j = await createDraft(human, company, draft());
    await Promise.allSettled([
      closePeriod(human, company, period, "Close"),
      postJournal(human, company, j.id, 0),
    ]);
    const stored = await Journal.findById(j.id);
    const closed = await Period.findById(period);
    expect(closed.status).toBe("closed");
    if (stored.status === "posted")
      expect(stored.postedAt.getTime()).toBeLessThanOrEqual(
        closed.closedAt.getTime(),
      );
  });
});

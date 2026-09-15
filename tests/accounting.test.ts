import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { bootstrap } from "../src/domains/companies/bootstrap";
import {
  createAccount,
  editAccount,
  createDraft,
  createPeriod,
  setupPioneer2027Periods,
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
  it("keeps posting true for new and raw legacy accounts without migration", async () => {
    expect((await Account.findById(debit)).postingAccount).toBe(true);
    await Account.updateOne({ _id: debit }, { $unset: { postingAccount: "" } });
    expect((await Account.findById(debit)).postingAccount).toBe(true);
    const entry = await createDraft(human, company, draft());
    await postJournal(human, company, entry.id, 0);
  });
  it("creates headers independently of control status and refuses manual permission on headers", async () => {
    const header = await createAccount(human, company, {
      code: "1500",
      name: "Fixed assets",
      type: "Asset",
      postingAccount: false,
    });
    expect(header.postingAccount).toBe(false);
    expect(header.controlAccount).toBe(false);
    expect(header.allowManualPosting).toBe(false);
    await expect(
      createAccount(human, company, {
        code: "1501",
        name: "Invalid",
        type: "Asset",
        postingAccount: false,
        allowManualPosting: true,
      }),
    ).rejects.toThrow();
    await expect(
      editAccount(
        human,
        company,
        header.id,
        { allowManualPosting: true },
        0,
        "Invalid policy",
      ),
    ).rejects.toThrow("Non-Posting");
    const child = await createAccount(human, company, {
      code: "1510",
      name: "Equipment",
      type: "Asset",
      parentId: header.id,
    });
    expect(child.postingAccount).toBe(true);
    expect(child.parentId).toBe(header.id);
  });
  it("rejects headers for manual and authenticated source drafts regardless of source labels", async () => {
    await editAccount(
      human,
      company,
      debit,
      { postingAccount: false, allowManualPosting: false },
      0,
      "Organizational header",
    );
    const source: Actor = {
      id: "erp",
      kind: "service",
      companies: [company],
      scopes: ["finance:source:write"],
    };
    for (const actor of [human, source]) {
      await expect(
        createDraft(actor, company, draft({ sourceSystem: "erp" })),
      ).rejects.toThrow("Non-Posting");
    }
    expect(await Journal.countDocuments()).toBe(0);
  });
  it("prevents conversion while any manual or source draft references the account", async () => {
    const source: Actor = {
      id: "erp",
      kind: "service",
      companies: [company],
      scopes: ["finance:source:write"],
    };
    for (const actor of [human, source]) {
      const entry = await createDraft(actor, company, draft());
      await expect(
        editAccount(
          human,
          company,
          debit,
          { postingAccount: false, allowManualPosting: false },
          0,
          "Unsafe header",
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect((await Account.findById(debit)).postingAccount).toBe(true);
      expect(await Audit.countDocuments({ action: "account.edit" })).toBe(0);
      await postJournal(human, company, entry.id, 0);
    }
    await editAccount(
      human,
      company,
      debit,
      { postingAccount: false, allowManualPosting: false },
      0,
      "Resolved drafts",
    );
  });
  it("serializes header conversion against new drafts", async () => {
    const results = await Promise.allSettled([
      createDraft(human, company, draft()),
      editAccount(
        human,
        company,
        debit,
        { postingAccount: false, allowManualPosting: false },
        0,
        "Concurrent policy",
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (await Account.findById(debit)).postingAccount === false &&
        (await Journal.exists({ status: "draft", "lines.accountId": debit })),
    ).toBeFalsy();
  });
  it("rechecks header policy at manual edit and final human/source review", async () => {
    const manualInput = draft();
    const entry = await createDraft(human, company, manualInput);
    const source: Actor = {
      id: "erp",
      kind: "service",
      companies: [company],
      scopes: ["finance:source:write"],
    };
    const imported = await createDraft(source, company, draft());
    // Fixture simulates out-of-band corruption; governed edits cannot make this transition.
    await Account.updateOne(
      { _id: debit },
      { $set: { postingAccount: false } },
    );
    await expect(
      editDraft(human, company, entry.id, manualInput, 0),
    ).rejects.toThrow("Non-Posting");
    for (const record of [entry, imported])
      await expect(postJournal(human, company, record.id, 0)).rejects.toThrow(
        "Non-Posting",
      );
  });
  it("preserves history and permits only exact reversal after conversion to a header", async () => {
    const input = draft();
    const entry = await createDraft(human, company, input);
    await postJournal(human, company, entry.id, 0);
    const original = (await Journal.findById(entry.id)).toObject();
    await editAccount(
      human,
      company,
      debit,
      { postingAccount: false, allowManualPosting: false },
      0,
      "Retired posting account",
    );
    const change = await Audit.findOne({
      action: "account.edit",
      entityId: debit,
    });
    expect(change.before.postingAccount).toBe(true);
    expect(change.after.postingAccount).toBe(false);
    expect(
      (await trialBalance(human, company, "2026-01-31")).rows.find(
        (row) => row.accountId === debit,
      )?.debitCents,
    ).toBe(12500);
    expect((await createDraft(human, company, input)).id).toBe(entry.id);
    const reversal = await reverseJournal(
      human,
      company,
      entry.id,
      "2026-01-20",
      "Exact historical correction",
    );
    expect(reversal.lines[0].creditCents).toBe(12500);
    expect((await Journal.findById(entry.id)).toObject()).toEqual(original);
    expect((await trialBalance(human, company, "2026-01-31")).debitCents).toBe(
      0,
    );
    await expect(
      editAccount(human, company, debit, { postingAccount: true }, 0, "Stale"),
    ).rejects.toMatchObject({ status: 409 });
    await editAccount(
      human,
      company,
      debit,
      { postingAccount: true, allowManualPosting: true },
      1,
      "Restore posting",
    );
    await createDraft(human, company, draft());
  });
  it("creates only twelve 2027 months and repeat setup preserves closed periods byte-for-byte", async () => {
    await Period.deleteMany({});
    expect(await Period.countDocuments()).toBe(0);
    expect(
      await setupPioneer2027Periods(human, company, "Approved calendar setup"),
    ).toMatchObject({ created: 12, existing: 0 });
    const periods = await Period.find({ companyId: company }).sort({
      startDate: 1,
    });
    expect(periods).toHaveLength(12);
    expect(periods[0].startDate).toBe("2027-01-01");
    expect(periods[1].endDate).toBe("2027-02-28");
    expect(periods[11].endDate).toBe("2027-12-31");
    expect(periods.every((p) => p.status === "open")).toBe(true);
    await closePeriod(human, company, periods[0].id, "Fixture close");
    const before = await Period.find({}).sort({ startDate: 1 }).lean();
    expect(
      await setupPioneer2027Periods(human, company, "Repeat"),
    ).toMatchObject({ created: 0, existing: 12 });
    expect(await Period.find({}).sort({ startDate: 1 }).lean()).toEqual(before);
    expect(
      await Audit.countDocuments({
        action: "period.create",
        reason: "Approved calendar setup",
      }),
    ).toBe(12);
    expect(
      await Period.countDocuments({ startDate: { $lt: "2027-01-01" } }),
    ).toBe(0);
    expect(await Journal.countDocuments()).toBe(0);
  });
  it("fills missing 2027 months without modifying exact existing months or another company", async () => {
    await createPeriod(human, company, {
      startDate: "2027-02-01",
      endDate: "2027-02-28",
    });
    const otherPeriod = await createPeriod(human, other, {
      startDate: "2027-01-01",
      endDate: "2027-12-31",
    });
    expect(
      await setupPioneer2027Periods(human, company, "Fill calendar"),
    ).toMatchObject({ created: 11, existing: 1 });
    expect((await Period.findById(otherPeriod.id)).status).toBe("open");
    expect(await Period.countDocuments({ companyId: other })).toBe(1);
    expect(
      await Period.countDocuments({
        companyId: company,
        startDate: "2026-01-01",
      }),
    ).toBe(1);
  });
  it("rejects overlaps atomically and uses normal overlap rules afterward", async () => {
    const conflict = await createPeriod(human, company, {
      startDate: "2027-12-15",
      endDate: "2028-01-15",
    });
    const before = await Period.find({}).lean();
    await expect(
      setupPioneer2027Periods(human, company, "Conflicting setup"),
    ).rejects.toMatchObject({ status: 409 });
    expect(await Period.find({}).lean()).toEqual(before);
    await Period.deleteOne({ _id: conflict.id });
    await setupPioneer2027Periods(human, company, "Approved calendar");
    await expect(
      createPeriod(human, company, {
        startDate: "2027-01-15",
        endDate: "2027-02-15",
      }),
    ).rejects.toThrow("overlap");
  });
  it("serializes simultaneous calendar setup and rolls back on audit failure", async () => {
    const failAudit = vi
      .spyOn(Audit, "create")
      .mockRejectedValueOnce(new Error("Fixture audit failure"));
    try {
      await expect(
        setupPioneer2027Periods(human, company, "Audit failure"),
      ).rejects.toThrow("Fixture audit failure");
    } finally {
      failAudit.mockRestore();
    }
    expect(
      await Period.countDocuments({ startDate: { $gte: "2027-01-01" } }),
    ).toBe(0);
    const results = await Promise.all([
      setupPioneer2027Periods(human, company, "Concurrent one"),
      setupPioneer2027Periods(human, company, "Concurrent two"),
    ]);
    expect(
      results.map((result) => result.created).sort((a, b) => a - b),
    ).toEqual([0, 12]);
  });
  it("requires authorized Pioneer calendar setup and a nonblank reason", async () => {
    for (const actor of [
      { ...human, companies: [other] },
      { ...human, scopes: ["finance:read"] },
      { ...human, kind: "service" as const },
    ])
      await expect(
        setupPioneer2027Periods(actor, company, "Denied"),
      ).rejects.toMatchObject({ status: 403 });
    await expect(
      setupPioneer2027Periods(human, other, "Wrong company"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      setupPioneer2027Periods(human, company, " "),
    ).rejects.toThrow();
    await Company.updateOne(
      { _id: company },
      { $set: { fiscalYearStart: "07-01" } },
    );
    try {
      await expect(
        setupPioneer2027Periods(human, company, "Noncalendar"),
      ).rejects.toMatchObject({ status: 409 });
    } finally {
      await Company.updateOne(
        { _id: company },
        { $set: { fiscalYearStart: "01-01" } },
      );
    }
  });
  it("rolls back account edits if their audit cannot be persisted", async () => {
    const failure = vi
      .spyOn(Audit, "create")
      .mockRejectedValueOnce(new Error("Test audit failure"));
    try {
      await expect(
        editAccount(
          human,
          company,
          debit,
          { name: "Must roll back" },
          0,
          "Test atomicity",
        ),
      ).rejects.toThrow("Test audit failure");
    } finally {
      failure.mockRestore();
    }
    expect((await Account.findById(debit)).name).toBe("Cash");
    expect((await Account.findById(debit)).revision).toBe(0);
    expect(await Audit.countDocuments({ action: "account.edit" })).toBe(0);
  });
  it("serializes concurrent edits and accepts only one revision", async () => {
    const results = await Promise.allSettled([
      editAccount(human, company, debit, { name: "First" }, 0, "First edit"),
      editAccount(human, company, debit, { name: "Second" }, 0, "Second edit"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await Audit.countDocuments({ action: "account.edit" })).toBe(1);
  });
  it("defaults legacy governance without rewriting old accounts", async () => {
    const rawAccounts = mongoose.connection.db!.collection<{
      _id: string;
      allowManualPosting?: boolean;
    }>(Account.collection.collectionName);
    await rawAccounts.updateOne(
      { _id: debit },
      { $unset: { controlAccount: "", allowManualPosting: "", revision: "" } },
    );
    const legacy = await Account.findById(debit);
    expect(legacy.controlAccount).toBe(false);
    expect(legacy.allowManualPosting).toBe(true);
    expect(legacy.revision).toBe(0);
    await createDraft(human, company, draft());
    expect(
      (await rawAccounts.findOne({ _id: debit }))?.allowManualPosting,
    ).toBeUndefined();
    await editAccount(
      human,
      company,
      debit,
      { name: "Legacy renamed" },
      0,
      "Reviewed correction",
    );
  });
  it("defaults new control accounts to nonmanual while allowing an explicit exception", async () => {
    const control = await createAccount(human, company, {
      code: "1100",
      name: "AR",
      type: "Asset",
      controlAccount: true,
    });
    expect(control.allowManualPosting).toBe(false);
    const exception = await createAccount(human, company, {
      code: "1110",
      name: "Allowance",
      type: "Asset",
      controlAccount: true,
      allowManualPosting: true,
    });
    expect(exception.allowManualPosting).toBe(true);
  });
  it("audits account edits and rejects stale revisions", async () => {
    const result = await editAccount(
      human,
      company,
      debit,
      {
        name: "Operating cash",
        controlAccount: true,
        allowManualPosting: false,
      },
      0,
      "Approved governance",
    );
    expect(result.revision).toBe(1);
    const audit = await Audit.findOne({
      companyId: company,
      action: "account.edit",
      entityId: debit,
    });
    expect(audit.before.name).toBe("Cash");
    expect(audit.after.name).toBe("Operating cash");
    expect(audit.after.allowManualPosting).toBe(false);
    expect(audit.reason).toBe("Approved governance");
    expect(audit.createdBy).toBe("human:test-accountant");
    expect(audit.createdAt).toBeInstanceOf(Date);
    await expect(
      editAccount(human, company, debit, { active: false }, 0, "Stale"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      editAccount(
        human,
        company,
        credit,
        { controlAccount: true },
        0,
        "No choice",
      ),
    ).rejects.toThrow("Choose manual");
  });
  it("deactivates/reactivates without deleting historical balances", async () => {
    const entry = await createDraft(human, company, draft());
    await postJournal(human, company, entry.id, 0);
    await editAccount(
      human,
      company,
      debit,
      { active: false },
      0,
      "Retire cash account",
    );
    await expect(createDraft(human, company, draft())).rejects.toThrow(
      "active",
    );
    expect(
      (await overview(human, company)).accounts.find((a) => a.id === debit)
        ?.active,
    ).toBe(false);
    expect(
      (await trialBalance(human, company, "2026-01-31")).rows.find(
        (a) => a.accountId === debit,
      )?.debitCents,
    ).toBe(12500);
    expect(
      (await generalLedger(human, company, "2026-01-01", "2026-01-31", debit))
        .rows,
    ).toHaveLength(1);
    await editAccount(
      human,
      company,
      debit,
      { active: true },
      1,
      "Approved reactivation",
    );
    await createDraft(human, company, draft());
  });
  it("enforces manual policy on create, edit and posting despite fake source labels", async () => {
    const entry = await createDraft(human, company, draft());
    await editAccount(
      human,
      company,
      debit,
      { allowManualPosting: false },
      0,
      "Restrict manual use",
    );
    await expect(createDraft(human, company, draft())).rejects.toThrow(
      "manual posting",
    );
    await expect(
      createDraft(human, company, draft({ sourceSystem: "pioneer-erp" })),
    ).rejects.toThrow("manual posting");
    await expect(
      editDraft(
        human,
        company,
        entry.id,
        draft({ sourceId: entry.sourceId }),
        0,
      ),
    ).rejects.toThrow("manual posting");
    await expect(postJournal(human, company, entry.id, 0)).rejects.toThrow(
      "manual posting",
    );
    await expect(
      createDraft(human, company, draft({ postingOrigin: "source" })),
    ).rejects.toThrow();
  });
  it("uses authenticated source provenance and still rejects inactive source accounts", async () => {
    const source: Actor = {
      id: "erp",
      kind: "service",
      companies: [company],
      scopes: ["finance:source:write"],
    };
    await editAccount(
      human,
      company,
      debit,
      { controlAccount: true, allowManualPosting: false },
      0,
      "AR control",
    );
    const input = draft({ sourceSystem: "pioneer-erp" });
    const entry = await createDraft(source, company, input);
    expect(entry.postingOrigin).toBe("source");
    expect((await createDraft(source, company, input)).id).toBe(entry.id);
    await expect(
      postJournal(source, company, entry.id, 0),
    ).rejects.toMatchObject({ status: 403 });
    await postJournal(human, company, entry.id, 0);
    const waiting = await createDraft(source, company, draft());
    await expect(
      editDraft(
        human,
        company,
        waiting.id,
        draft({ sourceId: waiting.sourceId }),
        0,
      ),
    ).rejects.toThrow("Imported");
    await editAccount(
      human,
      company,
      debit,
      { active: false },
      1,
      "Deactivate control",
    );
    await expect(createDraft(source, company, draft())).rejects.toThrow(
      "active",
    );
    await expect(postJournal(human, company, waiting.id, 0)).rejects.toThrow(
      "active",
    );
    expect((await createDraft(source, company, input)).id).toBe(entry.id);
  });
  it("uses server attribution for legacy source classification", async () => {
    const entry = await createDraft(
      human,
      company,
      draft({ sourceSystem: "erp" }),
    );
    await Journal.collection.updateOne(
      { _id: entry.id },
      { $unset: { postingOrigin: "" } },
    );
    await editAccount(
      human,
      company,
      debit,
      { allowManualPosting: false },
      0,
      "Restrict",
    );
    await expect(postJournal(human, company, entry.id, 0)).rejects.toThrow(
      "manual posting",
    );
    const source: Actor = {
      id: "legacy-erp",
      kind: "service",
      companies: [company],
      scopes: ["finance:source:write"],
    };
    const imported = await createDraft(
      source,
      company,
      draft({ sourceSystem: "erp" }),
    );
    await Journal.collection.updateOne(
      { _id: imported.id },
      { $unset: { postingOrigin: "" } },
    );
    await postJournal(human, company, imported.id, 0);
  });
  it("preserves exact audited reversal of inactive nonmanual accounts", async () => {
    const entry = await createDraft(human, company, draft());
    await postJournal(human, company, entry.id, 0);
    await editAccount(
      human,
      company,
      debit,
      { active: false, allowManualPosting: false },
      0,
      "Retire",
    );
    const reversed = await reverseJournal(
      human,
      company,
      entry.id,
      "2026-01-20",
      "Correct historical entry",
    );
    expect(reversed.postingOrigin).toBe("system");
    expect((await trialBalance(human, company, "2026-01-31")).debitCents).toBe(
      0,
    );
  });
  it("rejects account edits across company or actor authority", async () => {
    await expect(
      editAccount(human, other, debit, { name: "Wrong" }, 0, "Wrong company"),
    ).rejects.toMatchObject({ status: 404 });
    for (const actor of [
      { ...human, companies: [other] },
      { ...human, scopes: ["finance:read"] },
      { ...human, kind: "service" as const },
    ])
      await expect(
        editAccount(
          actor,
          company,
          debit,
          { active: false },
          0,
          "Not authorized",
        ),
      ).rejects.toMatchObject({ status: 403 });
  });
  it("never changes account code or type, including after accounting usage", async () => {
    const entry = await createDraft(human, company, draft());
    await postJournal(human, company, entry.id, 0);
    for (const changes of [{ code: "2000" }, { type: "Liability" }])
      await expect(
        editAccount(human, company, debit, changes, 0, "Unsafe mutation"),
      ).rejects.toThrow();
    expect((await Account.findById(debit)).type).toBe("Asset");
  });
  it("validates parent type, company, self and descendant cycles and permits removing parent", async () => {
    const child = await createAccount(human, company, {
      code: "1001",
      name: "Child",
      type: "Asset",
      parentId: debit,
    });
    await expect(
      editAccount(human, company, debit, { parentId: child.id }, 0, "Cycle"),
    ).rejects.toThrow("cycle");
    await expect(
      editAccount(human, company, debit, { parentId: debit }, 0, "Self"),
    ).rejects.toThrow("cycle");
    await expect(
      editAccount(human, company, debit, { parentId: credit }, 0, "Wrong type"),
    ).rejects.toThrow("Parent");
    const foreign = await createAccount(human, other, {
      code: "1000",
      name: "Other",
      type: "Asset",
    });
    await expect(
      editAccount(
        human,
        company,
        debit,
        { parentId: foreign.id },
        0,
        "Wrong company",
      ),
    ).rejects.toThrow("Parent");
    expect(
      (
        await editAccount(
          human,
          company,
          child.id,
          { parentId: null },
          0,
          "Make standalone",
        )
      ).parentId,
    ).toBeUndefined();
  });
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

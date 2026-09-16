import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { bootstrap } from "../src/domains/companies/bootstrap";
import {
  Company,
  Account,
  Period,
  Journal,
  Audit,
  ArInvoice,
  ArVersion,
  ArMapping,
} from "../src/models";
import {
  createAccount,
  createPeriod,
  createDraft,
  editAccount,
  postJournal,
  reverseJournal,
} from "../src/domains/accounting/service";
import {
  arOverview,
  importScan,
  makeInvoiceDraft,
  saveMapping,
  syncInvoices,
} from "../src/domains/ar/service";
import { readiness } from "../src/domains/ar/readiness";
import { mappingSchema } from "../src/domains/ar/mapping";
import type { Actor } from "../src/lib/auth/policy";
import type { FinancialInvoice } from "../src/domains/ar/contract";
import { invoice } from "./ar-fixtures";
const company = "pioneer-industries",
  other = "317-graphics";
const human: Actor = {
  id: "ar-fixture-reviewer",
  kind: "human",
  companies: [company, other],
  scopes: ["finance:read", "finance:write"],
};
let replica: MongoMemoryReplSet, ar: string, revenue: string;
const rules = () => [
  {
    mappingKey: "repair-revenue",
    accountId: revenue,
    reason: "Approved fixture repair mapping",
  },
  {
    mappingKey: "shipping-income",
    accountId: revenue,
    reason: "Approved fixture shipping mapping",
  },
];
const data = () => ({ arAccountId: ar, rules: rules() });
async function ingest(
  records: FinancialInvoice[] = [invoice()],
  mode: "parallel" | "authoritative" = "authoritative",
) {
  const c = await Company.findById(company);
  return importScan(
    human,
    company,
    {
      records: records.map((record) => ({
        record,
        capturedAt: "2027-01-16T00:00:00.000Z",
      })),
      scanRevision: "s".repeat(64),
      from: "2026-01-01",
      to: "2027-12-31",
    },
    mode,
    "Fixture source scan",
    c!.lockVersion,
  );
}
async function current() {
  const head = await ArInvoice.findOne({ companyId: company });
  return ArVersion.findById(head!.currentVersionId);
}
async function draft() {
  await ingest();
  return makeInvoiceDraft(
    human,
    company,
    (await current())!.id,
    "Reviewed fixture draft",
  );
}
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "8.0.12" },
  });
  vi.stubEnv("MONGODB_URI", replica.getUri("ar_fixture"));
  vi.stubEnv("PIONEER_AR_COMPANY_ID", company);
  vi.stubEnv("PIONEER_AR_AUTHORITATIVE_ENABLED", "true");
  await bootstrap("ar-fixture");
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  vi.restoreAllMocks();
  for (const model of [
    ArVersion,
    ArInvoice,
    ArMapping,
    Journal,
    Account,
    Period,
    Audit,
  ])
    await model.deleteMany({});
  ar = (
    await createAccount(human, company, {
      code: "FIXTURE-AR",
      name: "Fixture receivable",
      type: "Asset",
      controlAccount: true,
      allowManualPosting: false,
    })
  ).id;
  revenue = (
    await createAccount(human, company, {
      code: "FIXTURE-REV",
      name: "Fixture revenue",
      type: "Revenue",
    })
  ).id;
  await saveMapping(human, company, data(), 0, "Approve fixture mapping");
  await createPeriod(human, company, {
    startDate: "2027-01-01",
    endDate: "2027-01-31",
  });
});
describe("Pioneer AR projection and controlled accounting", () => {
  it("re-evaluates displayed mapping targets without rewriting parallel source versions", async () => {
    await ArMapping.deleteMany({ companyId: company });
    const record = invoice({
      invoiceDate: "2026-09-11",
      issuedAt: "2026-09-11T12:00:00.000Z",
    });
    record.lines[0].mappingKey = "equipment-sales";
    await ingest([record], "parallel");
    const before = await ArVersion.find({ companyId: company }).lean();
    expect((await arOverview(human, company)).rows[0].lineMappings).toEqual([
      { sourceLineId: "line:0", accountId: null },
      { sourceLineId: "shipping", accountId: null },
    ]);
    await saveMapping(human, company, {
      arAccountId: ar,
      rules: [{ mappingKey: "equipment-sales", accountId: revenue, reason: "Reviewed equipment" }],
    }, 0, "Approved equipment mapping");
    const row = (await arOverview(human, company)).rows[0];
    expect(row.lineMappings).toEqual([
      { sourceLineId: "line:0", accountId: revenue },
      { sourceLineId: "shipping", accountId: null },
    ]);
    expect(row.reviewIssues).not.toContain("No approved company mapping");
    expect(row.reviewIssues).not.toContain("Unresolved or ambiguous mapping: line:0");
    expect(row.reviewIssues).toContain("Unresolved or ambiguous mapping: shipping");
    expect(row.reviewIssues).toContain("Parallel / non-authoritative: projection only; no journal or opening AR");
    expect(await ArVersion.find({ companyId: company }).lean()).toEqual(before);
    expect(await ingest([record], "parallel")).toMatchObject({ imported: 0, replayed: 1 });
    expect(await ArInvoice.countDocuments({ companyId: company })).toBe(1);
    expect(await ArVersion.countDocuments({ companyId: company })).toBe(1);
    expect(await Journal.countDocuments({ companyId: company })).toBe(0);
  });

  it("imports source-only evidence and makes exactly balanced source draft with shipping once", async () => {
    const j = await draft();
    expect(j.status).toBe("draft");
    expect(j.postingOrigin).toBe("source");
    expect(
      j.lines.map((l: { debitCents: number; creditCents: number }) => [
        l.debitCents,
        l.creditCents,
      ]),
    ).toEqual([
      [10500, 0],
      [0, 10500],
    ]);
    expect(j.lines[0].accountId).toBe(ar);
    expect((await Account.findById(ar))!.allowManualPosting).toBe(false);
    const v = await current();
    expect(v!.originalAmountCents).toBe(10500);
    expect(v!.payload.context).toBeUndefined();
    expect(v!.payload.dueDate).toBeNull();
    expect(await Journal.countDocuments({ status: "posted" })).toBe(0);
    expect(
      await Audit.exists({
        action: "ar.draft",
        createdBy: "human:ar-fixture-reviewer",
        "after.mappingVersion": 1,
      }),
    ).toBeTruthy();
  });
  it("replays without duplicate versions/drafts/journals or import audits", async () => {
    const j = await draft();
    const audits = await Audit.countDocuments({});
    expect(await ingest()).toMatchObject({ imported: 0, replayed: 1 });
    expect(
      (await makeInvoiceDraft(human, company, (await current())!.id, "Retry"))
        .id,
    ).toBe(j.id);
    expect(await ArVersion.countDocuments({})).toBe(1);
    expect(await Journal.countDocuments({})).toBe(1);
    expect(await Audit.countDocuments({})).toBe(audits);
  });
  it("conflicting payload under the same revision aborts the entire import", async () => {
    await draft();
    await expect(
      ingest([
        invoice({ sourceId: "0".repeat(64) }),
        invoice({ invoiceNumber: "Changed under identical revision" }),
      ]),
    ).rejects.toThrow("different payload");
    expect(await ArInvoice.countDocuments({})).toBe(1);
    expect(await ArVersion.countDocuments({})).toBe(1);
  });
  it("changed unposted revisions supersede complete line sets and block old journal posting", async () => {
    const old = await draft();
    const next = invoice({ sourceRevision: "2".repeat(64) });
    next.lines[0].description = "Replaced source line set";
    await ingest([next]);
    expect((await Journal.findById(old.id))!.status).toBe("superseded");
    await expect(postJournal(human, company, old.id, 0)).rejects.toThrow(
      "Only current drafts",
    );
    const replacement = await makeInvoiceDraft(
      human,
      company,
      (await current())!.id,
      "Review changed source",
    );
    expect(replacement.id).not.toBe(old.id);
    expect(await ArVersion.countDocuments({})).toBe(2);
    expect(await Audit.exists({ action: "journal.supersede" })).toBeTruthy();
  });
  it("older known revision replay never rolls the head backward", async () => {
    await ingest();
    await ingest([invoice({ sourceRevision: "2".repeat(64) })]);
    const latest = (await current())!.id;
    await ingest();
    expect((await current())!.id).toBe(latest);
  });
  it("posted corrections preserve history and require an audited reversal before replacement", async () => {
    const j = await draft();
    await postJournal(human, company, j.id, 0);
    const original = await Journal.findById(j.id).lean();
    await ingest([invoice({ sourceRevision: "2".repeat(64) })]);
    expect((await current())!.status).toBe("correction-required");
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Review"),
    ).rejects.toThrow("Reverse/correct");
    expect(await Journal.findById(j.id).lean()).toEqual(original);
    await reverseJournal(
      human,
      company,
      j.id,
      "2027-01-20",
      "Reverse superseded source",
    );
    const fresh = await makeInvoiceDraft(
      human,
      company,
      (await current())!.id,
      "Reviewed after exact reversal",
    );
    expect(fresh.status).toBe("draft");
    const overview = await arOverview(human, company);
    expect(overview.rows[0].recognizedReceivableCents).toBe(0);
    expect(overview.rows[0].remainingBalanceCents).toBeNull();
  });
  it.each(["cancelled", "voided"] as const)(
    "%s without lines still cancels and supersedes an unposted draft",
    async (state) => {
      const j = await draft();
      await ingest([
        invoice({
          sourceRevision: "2".repeat(64),
          state,
          sourcePresent: false,
          lines: [],
          dataQuality: [
            "retained-cancellation-only",
            "missing-financial-lines",
          ],
          totals: { ...invoice().totals, sourceAmountCents: null },
        }),
      ]);
      expect((await current())!.status).toBe("canceled");
      expect((await Journal.findById(j.id))!.status).toBe("superseded");
      await expect(
        makeInvoiceDraft(human, company, (await current())!.id, "Review"),
      ).rejects.toThrow("needs review");
    },
  );
  it("posted cancellation requires correction and does not erase the recognized receivable", async () => {
    const j = await draft();
    await postJournal(human, company, j.id, 0);
    await ingest([
      invoice({ sourceRevision: "2".repeat(64), state: "voided", lines: [] }),
    ]);
    expect((await current())!.status).toBe("correction-required");
    const result = await arOverview(human, company);
    expect(result.rows[0].recognizedReceivableCents).toBe(10500);
    expect(result.rows[0].paymentStatus).toBe("not-tracked");
  });
  it("empty complete scans never imply cancellation", async () => {
    await draft();
    await ingest([]);
    expect((await current())!.status).toBe("drafted");
  });
  it("2026 parallel is projection-only regardless of open periods", async () => {
    await createPeriod(human, company, {
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    await ingest(
      [
        invoice({
          invoiceDate: "2026-12-15",
          issuedAt: "2026-12-15T12:00:00.000Z",
        }),
      ],
      "parallel",
    );
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Test"),
    ).rejects.toThrow("Parallel");
    expect(await Journal.countDocuments({})).toBe(0);
  });
  it("pre-cutover authoritative imports cannot recreate 2026 revenue or change mode by replay", async () => {
    const r = invoice({
      invoiceDate: "2026-12-15",
      issuedAt: "2026-12-15T12:00:00.000Z",
    });
    await ingest([r]);
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Test"),
    ).rejects.toThrow("opening AR");
    await expect(ingest([r], "parallel")).rejects.toThrow("mode");
    expect(await Journal.countDocuments({})).toBe(0);
  });
  it("authoritative gate must be explicitly enabled at draft and final posting", async () => {
    const j = await draft();
    vi.stubEnv("PIONEER_AR_AUTHORITATIVE_ENABLED", "false");
    try {
      await expect(postJournal(human, company, j.id, 0)).rejects.toThrow(
        "not enabled",
      );
      await expect(
        makeInvoiceDraft(human, company, (await current())!.id, "Test"),
      ).rejects.toThrow("gate is disabled");
    } finally {
      vi.stubEnv("PIONEER_AR_AUTHORITATIVE_ENABLED", "true");
    }
  });
  it("disabled gate rejects authoritative ingestion before ERP requests or writes while parallel remains projection-only", async () => {
    vi.stubEnv("PIONEER_AR_AUTHORITATIVE_ENABLED", "false");
    const outbound = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected ERP request"));
    const before = (await Company.findById(company))!.lockVersion;
    const auditCount = await Audit.countDocuments({});
    try {
      await expect(
        syncInvoices(
          human,
          company,
          { from: "2027-01-01", to: "2027-01-31", limit: 50 },
          "authoritative",
          "Must fail closed",
        ),
      ).rejects.toThrow("ingestion is disabled");
      await expect(ingest()).rejects.toThrow("ingestion is disabled");
      expect(outbound).not.toHaveBeenCalled();
      expect((await Company.findById(company))!.lockVersion).toBe(before);
      expect(await ArVersion.countDocuments({})).toBe(0);
      expect(await Audit.countDocuments({})).toBe(auditCount);
      await ingest([invoice()], "parallel");
      expect((await current())!.mode).toBe("parallel");
      await expect(
        makeInvoiceDraft(human, company, (await current())!.id, "Denied"),
      ).rejects.toThrow("Parallel");
      expect(await Journal.countDocuments({})).toBe(0);
    } finally {
      outbound.mockRestore();
      vi.stubEnv("PIONEER_AR_AUTHORITATIVE_ENABLED", "true");
    }
  });
  it("uses ordinary open-period restrictions without creating periods", async () => {
    await Period.deleteMany({});
    const j = await draft();
    await expect(postJournal(human, company, j.id, 0)).rejects.toThrow(
      "open accounting period",
    );
    expect(await Period.countDocuments({})).toBe(0);
  });
  it.each(["inactive", "header", "non-control"])(
    "AR account %s blocks final posting",
    async (policy) => {
      const j = await draft();
      await Account.updateOne(
        { _id: ar },
        {
          $set:
            policy === "inactive"
              ? { active: false }
              : policy === "header"
                ? { postingAccount: false }
                : { controlAccount: false },
        },
      );
      await expect(postJournal(human, company, j.id, 0)).rejects.toThrow(
        "AR must be",
      );
    },
  );
  it("mapping changes require reviewed rebuild and retain superseded drafts", async () => {
    const j = await draft();
    await saveMapping(
      human,
      company,
      data(),
      1,
      "Reviewed new mapping version",
    );
    await expect(postJournal(human, company, j.id, 0)).rejects.toThrow(
      "mapping changed",
    );
    const fresh = await makeInvoiceDraft(
      human,
      company,
      (await current())!.id,
      "Rebuild",
    );
    expect(fresh.id).not.toBe(j.id);
    expect((await Journal.findById(j.id))!.status).toBe("superseded");
    await expect(
      saveMapping(human, company, data(), 1, "Stale"),
    ).rejects.toThrow("Mapping changed");
  });
  it("rejects inactive, header, cross-company and wrong-type revenue mappings", async () => {
    const foreign = await createAccount(human, other, {
      code: "OTHER-REV",
      name: "Other revenue",
      type: "Revenue",
    });
    for (const accountId of [foreign.id, ar])
      await expect(
        saveMapping(
          human,
          company,
          { ...data(), rules: [{ ...rules()[0], accountId }] },
          1,
          "Review",
        ),
      ).rejects.toThrow("Revenue mappings");
    await editAccount(
      human,
      company,
      revenue,
      { postingAccount: false, allowManualPosting: false },
      0,
      "Fixture header",
    );
    await expect(
      saveMapping(human, company, data(), 1, "Review"),
    ).rejects.toThrow("Revenue mappings");
    await ingest();
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Review"),
    ).rejects.toThrow("Revenue mappings");
  });
  it("requires reviewed item mappings for ambiguous families and refuses ambiguous matches", async () => {
    const r = invoice({ sourceType: "part-sale-invoice" });
    r.lines[0].mappingKey = "part-sale-item";
    r.lines[0].dataQuality = ["revenue-classification-review"];
    r.dataQuality.push("revenue-classification-review");
    await ingest([r]);
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Review"),
    ).rejects.toThrow("mapping");
    expect(
      mappingSchema.safeParse({
        ...data(),
        rules: [{ ...rules()[0], mappingKey: "part-sale-item" }],
      }).success,
    ).toBe(false);
    await saveMapping(
      human,
      company,
      {
        ...data(),
        rules: [
          ...rules(),
          {
            mappingKey: "part-sale-item",
            itemReference: "Repair",
            accountId: revenue,
            reason: "Reviewed exact fixture item classification",
          },
        ],
      },
      1,
      "Review item",
    );
    expect(
      (
        await makeInvoiceDraft(
          human,
          company,
          (await current())!.id,
          "Reviewed item",
        )
      ).status,
    ).toBe("draft");
    const m = mappingSchema.parse({
      ...data(),
      rules: [rules()[0], rules()[0], rules()[1]],
    });
    expect(readiness(invoice(), m).join(" ")).toContain("ambiguous mapping");
  });
  it("zero-dollar warranty invoices remain projections without zero journals", async () => {
    const r = invoice();
    r.lines = [{ ...r.lines[0], unitPriceCents: 0, amountCents: 0 }];
    r.totals = {
      ...r.totals,
      sourceAmountCents: 0,
      subtotalCents: 0,
      shippingCents: 0,
      linesCents: 0,
    };
    await ingest([r]);
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Review"),
    ).rejects.toThrow("Zero-dollar");
    expect(await Journal.countDocuments({})).toBe(0);
  });
  it("transaction failure rolls back projection supersession and draft creation", async () => {
    const j = await draft();
    const before = await ArVersion.find({}).lean();
    vi.spyOn(Audit, "create").mockRejectedValueOnce(
      new Error("Fixture audit failure"),
    );
    await expect(
      ingest([invoice({ sourceRevision: "2".repeat(64) })]),
    ).rejects.toThrow("audit failure");
    expect(await ArVersion.find({}).lean()).toEqual(before);
    expect((await Journal.findById(j.id))!.status).toBe("draft");
    vi.restoreAllMocks();
    await ingest([invoice({ sourceRevision: "2".repeat(64) })]);
    vi.spyOn(ArVersion.prototype, "save").mockRejectedValueOnce(
      new Error("Fixture version failure"),
    );
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Review"),
    ).rejects.toThrow("version failure");
    expect(await Journal.countDocuments({})).toBe(1);
    expect((await current())!.journalId).toBeUndefined();
  });
  it("concurrent duplicate imports serialize or reject stale scans without duplicates", async () => {
    const results = await Promise.allSettled([ingest(), ingest()]);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
    expect(await ArInvoice.countDocuments({})).toBe(1);
    expect(await ArVersion.countDocuments({})).toBe(1);
    const version = (await current())!.id;
    await Promise.all([
      makeInvoiceDraft(human, company, version, "First"),
      makeInvoiceDraft(human, company, version, "Retry"),
    ]);
    expect(await Journal.countDocuments({})).toBe(1);
  });
  it("denies services, read-only users, foreign company bindings and forged source namespace", async () => {
    for (const actor of [
      { ...human, kind: "service" as const },
      { ...human, scopes: ["finance:read"] },
      { ...human, companies: [other] },
    ])
      await expect(
        saveMapping(actor, company, data(), 1, "Review"),
      ).rejects.toMatchObject({ status: 403 });
    await expect(
      saveMapping(human, other, data(), 0, "Review"),
    ).rejects.toThrow("not bound");
    await expect(
      syncInvoices(
        { ...human, companies: [] },
        company,
        {},
        "parallel",
        "Denied before outbound request",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      createDraft(
        { ...human, kind: "service", scopes: ["finance:source:write"] },
        company,
        {
          transactionDate: "2027-01-15",
          description: "Forged",
          sourceSystem: "pioneer-erp",
          sourceType: "repair-invoice",
          sourceId: "x",
          sourceRevision: "1",
          lines: [
            { accountId: ar, debitCents: 100, creditCents: 0 },
            { accountId: revenue, debitCents: 0, creditCents: 100 },
          ],
        },
      ),
    ).rejects.toThrow("governed AR bridge");
  });
  it("date changes preserve identity and null due dates never become Net 30", async () => {
    await ingest();
    await ingest([
      invoice({
        sourceRevision: "2".repeat(64),
        invoiceDate: "2027-02-01",
        issuedAt: "2027-02-01T00:00:00.000Z",
        paymentTermsSnapshot: {
          version: 1,
          code: "custom",
          label: "Non-calendar",
          days: null,
          qualityFlags: ["non-calendar-payment-terms"],
        },
      }),
    ]);
    expect(await ArInvoice.countDocuments({})).toBe(1);
    expect((await current())!.payload.dueDate).toBeNull();
    expect((await current())!.status).toBe("ready-for-draft");
  });
  it.each([
    "unknown-flag",
    "invalid-line-amount",
    "unsupported-tax-discount-or-credit",
    "conflicting-customer-identity",
    "invalid-due-date",
    "invalid-terms-snapshot",
  ])("quarantines header quality %s", async (flag) => {
    await ingest([invoice({ dataQuality: [flag] })]);
    expect((await current())!.status).toBe("needs-review");
    await expect(
      makeInvoiceDraft(human, company, (await current())!.id, "Review"),
    ).rejects.toThrow("needs review");
  });
  it("independently rejects invalid amounts, dates, customer/state and line flags even without header flags", async () => {
    const cases = [
      invoice({
        customer: { customerId: null, displayName: "Name is not identity" },
      }),
      invoice({ invoiceDate: null }),
      invoice({ state: "unknown" }),
    ];
    const badLine = invoice();
    badLine.lines[0].dataQuality = ["future-line-flag"];
    cases.push(badLine);
    for (const mutate of [
      (r: FinancialInvoice) => {
        r.totals.sourceAmountCents = null;
      },
      (r: FinancialInvoice) => {
        r.totals.subtotalCents = 5;
      },
      (r: FinancialInvoice) => {
        r.lines[0].amountCents = -1;
      },
      (r: FinancialInvoice) => {
        r.lines[0].quantity = 2;
      },
      (r: FinancialInvoice) => {
        r.totals.taxCents = 100;
      },
    ]) {
      const r = invoice();
      mutate(r);
      cases.push(r);
    }
    for (const r of cases)
      expect(readiness(r, mappingSchema.parse(data())).length).toBeGreaterThan(
        0,
      );
  });
});

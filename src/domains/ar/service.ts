import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { z } from "zod";
import {
  ArInvoice,
  ArVersion,
  ArMapping,
  Company,
  Journal,
} from "../../models";
import { authorize, type Actor } from "../../lib/auth/policy";
import { connect } from "../../lib/db";
import { assert, DomainError } from "../../lib/errors";
import { add, subtract } from "../../lib/money";
import { write, audit, createDraftInSession } from "../accounting/service";
import { text, id } from "../accounting/validation";
import {
  financialInvoiceSchema,
  retainedInvoiceSchema,
  type FinancialInvoice,
  type RetainedInvoice,
} from "./contract";
import { arCompany, authoritativeEnabled } from "./config";
import { scanInvoices, type Scan } from "./client";
import { mappingSchema, resolveLine, validateMappingAccounts } from "./mapping";
import { readiness } from "./readiness";
export const ingestionMode = z.enum(["parallel", "authoritative"]);
type Mode = z.infer<typeof ingestionMode>;
function assertIngestionMode(mode: Mode) {
  ingestionMode.parse(mode);
  assert(
    mode !== "authoritative" || authoritativeEnabled(),
    "Authoritative AR ingestion is disabled; use parallel mode",
    409,
  );
}
const by = (actor: Actor) => `${actor.kind}:${actor.id}`;
function bound(actor: Actor, companyId: string, scope = "finance:write") {
  authorize(actor, companyId, scope);
  assert(
    companyId === arCompany(),
    "ERP company is not bound to this FinancialAgent company",
    403,
  );
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const fingerprint = (record: FinancialInvoice) =>
  createHash("sha256").update(canonical(record)).digest("hex");
async function mappingFor(companyId: string, session: ClientSession) {
  const record = await ArMapping.findOne({ companyId })
    .sort({ version: -1 })
    .session(session);
  return record
    ? {
        record,
        data: mappingSchema.parse({
          arAccountId: record.arAccountId,
          rules: record.rules,
        }),
      }
    : null;
}
export async function saveMapping(
  actor: Actor,
  companyId: string,
  input: unknown,
  expectedVersion: number,
  reason: string,
) {
  bound(actor, companyId);
  const data = mappingSchema.parse(input);
  text.parse(reason);
  z.number().int().nonnegative().parse(expectedVersion);
  return write(actor, companyId, "finance:write", async (session) => {
    const previous = await mappingFor(companyId, session);
    assert(
      (previous?.record.version || 0) === expectedVersion,
      "Mapping changed; reload before saving",
      409,
    );
    await validateMappingAccounts(companyId, data, session);
    const [record] = await ArMapping.create(
      [
        {
          ...data,
          _id: randomUUID(),
          companyId,
          version: expectedVersion + 1,
          reason,
          createdBy: by(actor),
          updatedBy: by(actor),
        },
      ],
      { session },
    );
    await audit(
      session,
      actor,
      companyId,
      "ar.mapping",
      record.id,
      reason,
      previous?.record.toObject(),
      record.toObject(),
    );
    return record;
  });
}
async function postedOriginals(
  companyId: string,
  invoiceId: string,
  session: ClientSession,
) {
  const versions = await ArVersion.find({ companyId, invoiceId })
    .select("_id arAccountId")
    .session(session);
  const originals = await Journal.find({
    companyId,
    arVersionId: { $in: versions.map((v) => v.id) },
    status: "posted",
  }).session(session);
  const reversals = await Journal.find({
    companyId,
    reversalOf: { $in: originals.map((j) => j.id) },
    status: "posted",
  }).session(session);
  return {
    versions,
    originals,
    reversals,
    outstanding: originals.filter(
      (j) => !reversals.some((r) => r.reversalOf === j.id),
    ),
  };
}
async function supersedeDrafts(
  actor: Actor,
  companyId: string,
  versionId: string,
  session: ClientSession,
  reason: string,
) {
  const drafts = await Journal.find({
    companyId,
    arVersionId: versionId,
    status: "draft",
  }).session(session);
  for (const draft of drafts) {
    const before = draft.toObject();
    draft.status = "superseded";
    draft.revision++;
    draft.updatedBy = by(actor);
    await draft.save({ session });
    await audit(
      session,
      actor,
      companyId,
      "journal.supersede",
      draft.id,
      reason,
      before,
      draft.toObject(),
    );
  }
}
function modeIssues(record: RetainedInvoice, mode: Mode) {
  if (mode === "parallel")
    return [
      "Parallel / non-authoritative: projection only; no journal or opening AR",
    ];
  if (!record.invoiceDate || record.invoiceDate < "2027-01-01")
    return [
      "Pre-cutover or undated invoice: opening AR needs a separate reconciled migration",
    ];
  return authoritativeEnabled()
    ? []
    : ["Authoritative AR draft/posting gate is disabled"];
}
async function evaluate(
  companyId: string,
  record: RetainedInvoice,
  mode: Mode,
  session: ClientSession,
) {
  const mapping = await mappingFor(companyId, session);
  const issues = [
    ...readiness(record, mapping?.data || null),
    ...modeIssues(record, mode),
  ];
  if (mapping)
    try {
      await validateMappingAccounts(companyId, mapping.data, session);
    } catch (error) {
      if (error instanceof DomainError) issues.push(error.message);
      else throw error;
    }
  return { mapping, issues };
}
/** Internal complete-scan persistence; never exposed as an arbitrary browser payload import. */
export async function importScan(
  actor: Actor,
  companyId: string,
  scan: Scan,
  modeInput: Mode,
  reason: string,
  expectedLockVersion: number,
) {
  bound(actor, companyId);
  const mode = ingestionMode.parse(modeInput);
  assertIngestionMode(mode);
  text.parse(reason);
  assert(
    scan.records.length <= 250 &&
      scan.records.reduce((n, item) => n + item.record.lines.length, 0) <= 5000,
    "FinancialAgent atomic scan bounds exceeded",
    413,
  );
  const parsed = scan.records.map((item) => ({
    record: financialInvoiceSchema.parse(item.record),
    capturedAt: z.iso.datetime().parse(item.capturedAt),
  }));
  assert(
    new Set(parsed.map((item) => item.record.sourceId)).size === parsed.length,
    "Duplicate scan identity",
    409,
  );
  return write(actor, companyId, "finance:write", async (session) => {
    const company = await Company.findById(companyId).session(session);
    assert(
      company?.lockVersion === expectedLockVersion + 1,
      "Company changed during ERP scan; rescan before importing",
      409,
    );
    let imported = 0,
      replayed = 0;
    for (const { record, capturedAt } of parsed) {
      const identity = {
        companyId,
        sourceSystem: record.sourceSystem,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
      };
      let head = await ArInvoice.findOne(identity).session(session);
      if (!head)
        [head] = await ArInvoice.create(
          [
            {
              ...identity,
              _id: randomUUID(),
              createdBy: by(actor),
              updatedBy: by(actor),
            },
          ],
          { session },
        );
      const prior = await ArVersion.findOne({
        companyId,
        invoiceId: head.id,
        sourceRevision: record.sourceRevision,
      }).session(session);
      const hash = fingerprint(record);
      if (prior) {
        assert(
          prior.fingerprint === hash,
          "Source revision replay has different payload",
          409,
        );
        assert(
          prior.mode === mode,
          "Existing revision ingestion mode cannot be silently changed",
          409,
        );
        replayed++;
        continue; // A historical replay never rolls the head backward.
      }
      const old = head.currentVersionId
        ? await ArVersion.findOne({
            _id: head.currentVersionId,
            companyId,
          }).session(session)
        : null;
      if (old) {
        await supersedeDrafts(
          actor,
          companyId,
          old.id,
          session,
          "ERP source revision changed or canceled",
        );
        const before = old.toObject();
        old.status = "superseded";
        old.updatedBy = by(actor);
        await old.save({ session });
        await audit(
          session,
          actor,
          companyId,
          "ar.supersede",
          old.id,
          reason,
          before,
          old.toObject(),
        );
      }
      const canceled =
        record.state === "cancelled" || record.state === "voided";
      const { issues } = await evaluate(companyId, record, mode, session);
      const financial = await postedOriginals(companyId, head.id, session);
      const status = financial.outstanding.length
        ? "correction-required"
        : canceled
          ? "canceled"
          : issues.length
            ? "needs-review"
            : "ready-for-draft";
      // Hash complete validated evidence, but retain no operational context/PO/shipment fields.
      const { context: omittedContext, ...payload } = record;
      void omittedContext;
      const [version] = await ArVersion.create(
        [
          {
            _id: randomUUID(),
            companyId,
            invoiceId: head.id,
            sourceRevision: record.sourceRevision,
            fingerprint: hash,
            payload,
            originalAmountCents: record.totals.sourceAmountCents,
            capturedAt,
            importedAt: new Date(),
            mode,
            status,
            issues,
            createdBy: by(actor),
            updatedBy: by(actor),
          },
        ],
        { session },
      );
      head.currentVersionId = version.id;
      head.updatedBy = by(actor);
      await head.save({ session });
      await audit(
        session,
        actor,
        companyId,
        "ar.import",
        version.id,
        reason,
        undefined,
        {
          invoiceId: head.id,
          sourceId: record.sourceId,
          sourceRevision: record.sourceRevision,
          fingerprint: hash,
          mode,
          status,
          scanRevision: scan.scanRevision,
          from: scan.from,
          to: scan.to,
        },
      );
      imported++;
    }
    return {
      imported,
      replayed,
      complete: true,
      mode,
      scanRevision: scan.scanRevision,
    };
  });
}
export async function syncInvoices(
  actor: Actor,
  companyId: string,
  query: unknown,
  mode: Mode,
  reason: string,
) {
  bound(actor, companyId);
  assertIngestionMode(mode);
  text.parse(reason);
  await connect();
  const company = await Company.findById(companyId);
  assert(company, "Company not found", 404);
  const scan = await scanInvoices(query);
  return importScan(actor, companyId, scan, mode, reason, company.lockVersion);
}
function storedRecord(payload: unknown): RetainedInvoice {
  return retainedInvoiceSchema.parse(payload);
}
export async function makeInvoiceDraft(
  actor: Actor,
  companyId: string,
  versionId: string,
  reason: string,
) {
  bound(actor, companyId);
  id.parse(versionId);
  text.parse(reason);
  return write(actor, companyId, "finance:write", async (session) => {
    const version = await ArVersion.findOne({
      _id: versionId,
      companyId,
    }).session(session);
    assert(version, "AR version not found", 404);
    assert(
      await ArInvoice.exists({
        _id: version.invoiceId,
        companyId,
        currentVersionId: version.id,
      }).session(session),
      "Source revision changed; reload",
      409,
    );
    const record = storedRecord(version.payload);
    assert(
      version.mode === "authoritative",
      "Parallel projections cannot create accounting drafts",
      409,
    );
    const { mapping, issues } = await evaluate(
      companyId,
      record,
      version.mode,
      session,
    );
    assert(
      mapping && issues.length === 0,
      `Invoice needs review: ${issues.join("; ")}`,
      409,
    );
    const financial = await postedOriginals(
      companyId,
      version.invoiceId,
      session,
    );
    const alreadyPosted = financial.outstanding.find(
      (j) => j.arVersionId === version.id,
    );
    if (alreadyPosted) return alreadyPosted;
    assert(
      financial.outstanding.length === 0,
      "Reverse/correct the previously posted revision before a replacement draft",
      409,
    );
    assert(
      !financial.originals.some((j) => j.arVersionId === version.id),
      "This revision already had a posted journal; a new source revision is required",
      409,
    );
    assert(
      record.totals.sourceAmountCents! > 0,
      "Zero-dollar invoice remains a projection; no journal is needed",
      409,
    );
    const previous = version.journalId
      ? await Journal.findOne({ _id: version.journalId, companyId }).session(
          session,
        )
      : null;
    if (
      previous?.status === "draft" &&
      version.mappingVersion === mapping.record.version
    )
      return previous;
    const before = version.toObject();
    await supersedeDrafts(
      actor,
      companyId,
      version.id,
      session,
      "AR mapping reviewed and draft rebuilt",
    );
    const credits = new Map<string, number>();
    for (const line of record.lines) {
      const account = resolveLine(record, line, mapping.data)!;
      credits.set(account, add(credits.get(account) || 0, line.amountCents!));
    }
    // A scoped internal service actor follows the existing source-account policy.
    // The surrounding human audit retains the initiating reviewer identity.
    const serviceActor: Actor = {
      id: "pioneer-ar-bridge",
      kind: "service",
      companies: [companyId],
      scopes: ["finance:source:write"],
    };
    const draft = await createDraftInSession(
      serviceActor,
      companyId,
      {
        transactionDate: record.invoiceDate,
        description: `ERP invoice ${record.invoiceNumber}`.slice(0, 500),
        sourceSystem: "pioneer-erp",
        sourceType: record.sourceType,
        sourceId: record.sourceId,
        sourceRevision: `${record.sourceRevision}:m${mapping.record.version}`,
        lines: [
          {
            accountId: mapping.data.arAccountId,
            debitCents: record.totals.sourceAmountCents,
            creditCents: 0,
            memo: "Accounts receivable",
          },
          ...[...credits]
            .filter(([, amount]) => amount > 0)
            .map(([accountId, amount]) => ({
              accountId,
              debitCents: 0,
              creditCents: amount,
              memo: "ERP financial lines (shipping included once)",
            })),
        ],
      },
      session,
    );
    assert(
      draft.status === "draft",
      "Historical draft is no longer eligible",
      409,
    );
    draft.arVersionId = version.id;
    await draft.save({ session });
    Object.assign(version, {
      journalId: draft.id,
      mappingVersion: mapping.record.version,
      arAccountId: mapping.data.arAccountId,
      status: "drafted",
      issues: [],
      updatedBy: by(actor),
    });
    await version.save({ session });
    await audit(
      session,
      actor,
      companyId,
      "ar.draft",
      version.id,
      reason,
      before,
      {
        journalId: draft.id,
        sourceId: record.sourceId,
        sourceRevision: record.sourceRevision,
        mode: version.mode,
        mappingVersion: version.mappingVersion,
      },
    );
    return draft;
  });
}
export async function arOverview(
  actor: Actor,
  companyId: string,
  cursor?: string,
  invoiceId?: string,
) {
  bound(actor, companyId, "finance:read");
  if (cursor) id.parse(cursor);
  if (invoiceId) id.parse(invoiceId);
  const db = await connect();
  return db.connection.transaction(
    async (session) => {
      const mapping = await mappingFor(companyId, session);
      const heads = await ArInvoice.find({
        companyId,
        ...(invoiceId
          ? { _id: invoiceId }
          : cursor
            ? { _id: { $gt: cursor } }
            : {}),
      })
        .sort({ _id: 1 })
        .limit(51)
        .session(session);
      const rows = [];
      for (const head of heads.slice(0, 50)) {
        const current = await ArVersion.findOne({
          companyId,
          _id: head.currentVersionId,
        }).session(session);
        if (!current) continue;
        const financial = await postedOriginals(companyId, head.id, session);
        let recognizedReceivableCents = 0;
        for (const journal of [
          ...financial.originals,
          ...financial.reversals,
        ]) {
          const original = journal.reversalOf
            ? financial.originals.find((j) => j.id === journal.reversalOf)
            : journal;
          const account = financial.versions.find(
            (v) => v.id === original?.arVersionId,
          )?.arAccountId;
          for (const line of journal.lines)
            if (line.accountId === account)
              recognizedReceivableCents = add(
                recognizedReceivableCents,
                subtract(line.debitCents, line.creditCents),
              );
        }
        const record = storedRecord(current.payload);
        const evaluated = await evaluate(
          companyId,
          record,
          current.mode,
          session,
        );
        rows.push({
          invoiceId: head.id,
          current: current.toObject(),
          reviewIssues: evaluated.issues,
          lineMappings: record.lines.map((line) => ({
            sourceLineId: line.sourceLineId,
            accountId: evaluated.mapping
              ? resolveLine(record, line, evaluated.mapping.data)
              : null,
          })),
          recognizedReceivableCents,
          paymentStatus: "not-tracked",
          remainingBalanceCents: null,
          postedJournalIds: financial.originals.map((j) => j.id),
          reversalJournalIds: financial.reversals.map((j) => j.id),
          versions: invoiceId
            ? await ArVersion.find({ companyId, invoiceId: head.id })
                .sort({ importedAt: -1 })
                .limit(50)
                .session(session)
                .lean()
            : undefined,
          versionCount: invoiceId
            ? await ArVersion.countDocuments({
                companyId,
                invoiceId: head.id,
              }).session(session)
            : undefined,
        });
      }
      return {
        rows,
        nextCursor: heads.length > 50 ? heads[49].id : null,
        mapping: mapping?.record.toObject() || null,
        authoritativeEnabled: authoritativeEnabled(),
      };
    },
    { readConcern: { level: "snapshot" } },
  );
}

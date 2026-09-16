# Pioneer invoice projection and AR subledger v1

## Audit and ownership

The existing implementation has company-scoped accounts, explicit posting/control/manual flags, audited revision-checked edits, inclusive open/closed periods, balanced integer-cent journals, server-assigned manual/source provenance, immutable posting, exact reversals and source identity/hash idempotency. All company mutations serialize inside snapshot/majority MongoDB transactions through the Company lock. Source services may create drafts against posting controls, but final posting requires a human with finance:write. Reporting includes posted originals and reversals only. No AR projection, customer payments or ERP invoice client existed before this change.

This bridge reuses those services. `createDraftInSession` is an internal composition point under the existing company write transaction; it performs the same authorization, balance, account and idempotency checks as ordinary creation. A scoped internal source actor creates the journal, with the initiating human, source revision, ingestion mode and mapping version retained in AR audit. The three Pioneer invoice source types are reserved from generic draft creation so callers cannot bypass the bridge. Other existing source namespaces/provenance behavior remain unchanged.

ERP owns operational invoices, customer identities, retained source amounts, dates, terms and cancellation evidence. FinancialAgent owns its projection and recognized invoice AR, journals and corrections. Payments, applications, remaining balance, settlement, aging and opening AR need separate implementations. **ERP active/open does not mean unpaid or collectible.** This version deliberately returns remainingBalanceCents=null and paymentStatus=not-tracked; recognizedReceivableCents is the linked posted AR debits/credits including reversals, not a certified collectible balance or a complete AR control reconciliation.

Read-only source references reviewed: equipment-tracker/docs/architecture/financial-agent-customer-invoice-contract.md and its strict src/lib/financialAgentInvoices.ts schemas (September 15, 2026). No ERP or Pioneer Managers code is modified. No production connection, source write, customer master, opening balance, payment, bank, AI or QuickBooks migration is included.

## Configuration and explicit preparation

Server-only variables, following the repository's environment configuration conventions:

| Variable | Contract |
| --- | --- |
| PIONEER_ERP_BASE_URL | Approved ERP origin only, no path/query/credentials. HTTPS in production; HTTP loopback allowed outside production. |
| FINANCIAL_AGENT_API_KEY | Dedicated ERP FinancialAgent bearer key with finance:invoices:read and customers:read. Do not reuse service credentials, manager keys or browser public variables. |
| PIONEER_AR_COMPANY_ID | Explicit FinancialAgent company bound to ERP literal pioneer, normally pioneer-industries. Required for all AR operations. Source payloads cannot select the destination. |
| PIONEER_AR_AUTHORITATIVE_ENABLED | Only literal true enables authoritative ingestion, draft creation and final posting. Default false. Not tied to the clock. Disabling also prevents previously created AR drafts from posting. |

Existing MongoDB, human authentication, APP_BASE_URL and transaction-ready replica-set requirements continue unchanged. No credential or origin is returned to the UI. Mappings are immutable versioned database configuration approved by a company-authorized human, not account numbers in environment variables.

Before first approved deployment/use, provision the three AR collections and unique indexes with the protected FinanceAgent environment loaded: `npx --no-install tsx scripts/ar-indexes.ts`. This explicit schema-preparation command only creates indexes/collections, not users, companies, accounts, periods, projections or journals. Do not run accounting bootstrap to initialize AR. The command was not run against persistent databases during implementation. There is no startup sync or auto-bootstrap. Review database backup/deployment authorization separately.

## Client protocol and scan safety

Only GET `/api/integrations/financial-agent/customer-invoices` is called, with contract=pioneer-customer-invoices-v1, required inclusive UTC from/to, limit (default 50, max 100), then the opaque nextCursor with unchanged parameters. Windows span at most 366 inclusive days. Each page is validated against the strict mirrored schema: contract, capturedAt, period, sourceConsistency, records and pagination.total/limit/scanRevision/nextCursor/complete. There is no detail endpoint or updated-since approximation.

All pages are collected and validated **before any write**. Duplicate identity, mismatched period/limit/revision/count, repeated cursor, incomplete scan, invalid schema or oversized body fails. A 409 discards accumulated pages and restarts from page one, at most three attempts; repeated changes remain an error. 400, 401, 403, 413, 422 and 503 have explicit messages; no upstream response body/credential is exposed. Redirects are rejected. Requests have a 30-second timeout and scans a 90-second network deadline. Responses are limited to 2 MiB.

FinancialAgent deliberately imposes smaller atomic import bounds: **250 invoices and 5,000 lines**, independent of ERP's 5,000-invoice/20,000-line export bounds. Narrow the window on bounds failure; smaller pages only fix response-size limits. Undated rows remain in every applicable ERP scan; if these alone exceed bounds, source review or a future staged import design is needed. No partial subset is marked successful.

The complete import commits in one existing company transaction. The company lock version observed before the HTTP scan must still match; concurrent company writes force an explicit rescan, preventing overlapping scans from regressing new evidence. Database/audit failures roll back new heads, versions, supersession and audits. No absence is interpreted as cancellation. Rescan historical windows for corrections; changed invoice dates can move an identity between windows. capturedAt is observation time; importedAt is import time. Neither is an invoice/posting date or an authoritative ERP revision timestamp. Unchanged replays preserve the first observation metadata; they do not certify a permanent freshness SLA.

## Persisted schema and lifecycle

All records use existing UUID/string-company, creator/updater and timestamp conventions:

- ArInvoice: identity head, unique companyId + sourceSystem + sourceType + sourceId, currentVersionId.
- ArVersion: unique companyId + invoiceId + sourceRevision; validated source fingerprint; retained invoice/customer references, UTC source dates/stored terms, source amount, full revision line set/categories/state/quality flags; capturedAt/importedAt; immutable ingestion mode; lifecycle status; journalId, mappingVersion and arAccountId when drafted. OriginalAmountCents is this revision's sourceAmountCents, nullable, not an immutable ERP original and not remaining AR. Operational context/PO/shipment fields are excluded from persistence; their validated values still participate in the fingerprint.
- ArMapping: unique companyId + numeric version; AR control account, reviewed rules, approval reason and actor. Previous configurations remain available for audit.
- Journal adds arVersionId and terminal unposted status superseded. Superseded entries remain visible but cannot be edited or posted. The existing embedded-line schema explicitly disables its unused version key so transaction rollback cannot try to restore a nonexistent __v field.

An unchanged sourceRevision with the same canonical validated payload hash is a no-op: no additional projection version, journal or import audit. Different content under the same revision is a conflict. Historical known-revision replay never moves the head backward. A different mode on an existing revision conflicts; promotion of a parallel revision is not an implicit reimport operation. Canonical-source identities are preserved and flagged; later ERP Finance-ID initialization needs reviewed reconciliation, never name/number/amount matching.

New revisions replace/version complete line sets, not positions. Before posting, the previous version becomes superseded and any linked drafts become superseded in the same transaction. After posting, the immutable journal remains untouched and the new version is correction-required. A replacement draft is blocked until all unreversed posted originals for that invoice are reversed through the existing human correction workflow. The same posted revision cannot be posted again after reversal; corrections need a new source revision. The UI provides original/reversal links and live recognized AR. Version statuses record lifecycle transitions; linked journal/reversal evidence remains authoritative for whether a historical obligation was offset.

Explicit cancelled/voided records update state even when they lack customer/line/amount detail. Unposted drafts are superseded; posted originals require human correction. Financial history is never deleted. There is no automatic reversal, posting, cancellation from scan absence, or settlement writeback.

## Readiness and reviewed mappings

Structural contract violations abort the scan. Valid nullable evidence is retained but unsafe records become needs-review. Both header and line flags are checked independently, and unknown future flags block drafting. Missing identity/date, issue-date disagreement, unknown/unissued state, negative/unknown amounts, quantity/price extensions, subtotal/line/total/shipping mismatch, unsupported tax/discount/credit evidence and unresolved/ambiguous mapping block normal drafts. Amount checks use safe integer cents and BigInt sums/decimal quantity extensions; no rounding or residual plug exists.

Historical/positional limitations and missing due dates/unsupported non-calendar terms are visible information, not fabricated data. Invalid due dates/terms snapshots remain blockers. DueDateSource=explicit means stored source evidence, possibly derived and stored at issuance; no current terms or Net 30 fallback is used. Tax/discount null is unknown, not zero. This invoice contract cannot support tax/credit accounting merely by assigning it to revenue.

AR must be an active posting Asset control account in the bound company. Revenue rules must resolve to active posting Revenue accounts in that same company. Manual-disabled controls remain manual-disabled; the existing source-draft policy is used. Control metadata does not override header restrictions. Accounts are checked at mapping save, draft construction and final posting.

Each rule contains mappingKey, accountId, reason and optional sourceType/itemReference/partId. Allowed keys are repair-revenue, equipment-sales, part-sale-item, standalone-item, shipping-income and unmapped. Part-sale-item, standalone-item and unmapped require a reviewed exact itemReference or partId. No blanket default is accepted for them. Specific item rules override family rules; multiple equally applicable rules fail closed. Review source classifications explicitly, including tax-like items; never infer GL accounts from description text or operational customer names.

Example **shape only**, replace placeholders after account/item review (not an import manifest):

```json
[
  {"mappingKey":"repair-revenue","accountId":"REVIEWED_REVENUE_UUID","reason":"Approved repair-service family"},
  {"mappingKey":"part-sale-item","partId":"REVIEWED_ERP_PART_ID","accountId":"REVIEWED_REVENUE_UUID","reason":"Reviewed item classification"},
  {"mappingKey":"shipping-income","accountId":"REVIEWED_SHIPPING_REVENUE_UUID","reason":"Approved customer shipping income"}
]
```

Saving mappings uses an expected version plus reason/audit. Changed mappings block old unposted drafts until explicitly rebuilt/reviewed. Rebuild retains the superseded draft and creates an idempotent journal key using sourceRevision plus mapping version. Source identity/revision remains separately retained in AR and audit. Debit AR for the exact source amount, credit mapped complete financial lines; shipping is already a line and is never added from the header again. Credits may be grouped by account using exact cents. Zero-dollar invoices remain projections without a journal.

## Human UI/API workflow

`/ar?company=pioneer-industries` reuses authenticated company selection/navigation. It shows source dates, revision amount, recognized invoice AR, unknown settlement, ingestion mode/status, line evidence/quality, terms, mappings, journal/reversal links and revision history. It pages 50 invoices at a time; invoice history shows the newest 50 and total count. Review original version details through the stored audited records when older history is required. The first version uses an explicit JSON rules editor with available Revenue UUIDs and an AR account selector; it is not a customer master or a guessed automatic mapping wizard.

GET `/api/ar?company=...&cursor=...` returns the scoped projection/subledger view; optional invoice=UUID selects one invoice and revision history. Existing finance:read is required; responses are private/no-store. It is an internal app API, not the future Collections contract.

POST `/api/ar` supports strictly validated JSON commands, same-origin human authentication, company binding and finance:write:

1. `mapping`: companyId, data={arAccountId,rules}, version (0 for first), reason.
2. `sync`: companyId, query={from,to,limit}, mode=parallel|authoritative, reason. Fetches a complete read-only ERP window and persists projections only.
3. `draft`: companyId, versionId, reason. Revalidates the current source/mapping and creates or returns a source draft. Then use the existing journal detail review/Post action. There is **no auto-posting**.

Services/readers cannot change mapping, sync or create AR drafts through this endpoint. Authentication, company scoping, CSRF/origin checks and production DEV_AUTH rejection remain unchanged. Generic journal POST also enforces the AR current-version/mode/mapping guard. No raw source-upload action is exposed to the browser.

## Parallel mode, cutover and future Collections

QuickBooks is official through **12-31-2026**; FinancialAgent is planned authoritative beginning **01-01-2027**, subject to separate reconciliation/sign-off. Parallel mode always stores projection-only evidence, even for future-dated records. It never creates journals, opens periods or fabricates balances. Authoritative ingestion itself requires the explicit environment gate (otherwise rejected before an ERP request or write). Drafts additionally require invoiceDate >= 2027-01-01; undated/pre-cutover rows remain review-only. Mode never changes merely because the clock advances. Draft creation follows the existing draft mechanism (an open period is not required to save a draft); posting still requires an existing open period. No period is created or bypassed.

**2026 invoices financially open at cutover must eventually become opening AR without recreating 2026 revenue.** ERP active/open cannot identify them. This requires reconciled QuickBooks/FinancialAgent settlement evidence and a separate opening migration. No such migration is implemented here.

A future separately scoped Collections contract should read FinancialAgent's company/customer/invoice identities, certified original/remaining balances, payment applications, settlement status, recorded due date, aging as-of date, source lineage, correction/review state and freshness. Grant a dedicated ar:read scope only when those semantics exist. Until payments/opening AR and reconciliation are implemented, this projection API must not be advertised as collectible balance truth. ERP remains operational invoice authority; FinancialAgent becomes financial AR/payment/settlement authority after approved cutover. No Managers change or ERP settlement writeback belongs to this implementation.

## Operational limits and next step

Before deployment: separately approve the schema/index command, distinct ERP key/base origin, company binding, actual AR/revenue/item mappings, source-quality remediation and representative read-only contract verification. No live source acceptance was performed. Keep authoritative mode disabled during 2026 parallel review. Resolve legacy identity transitions, missing customer references/dates/terms, mismatched totals, unsupported taxes/credits and retained cancellation gaps at their source/review boundary.

Do not roll back to an older writable release after importing AR: it may ignore superseded status and current-revision/parallel guards. Stop writes first, retain a compatible guarded release and preserve all projections/audits/posted history. No automatic downgrade or deletion script is provided. Unknown errors roll back rather than reporting a partial import success. This is bounded v1, not a durable job runner; larger datasets need a separately designed staged/resumable import and operational freshness monitoring.

Recommended next step: local/staging review of representative source fixtures and approved per-item mappings, then separately authorize a bounded live read-only parallel scan. After source-data acceptance, design FinancialAgent customer payments/applications and the reconciled opening AR migration as separate work; do not connect Collections to uncertified remaining balances.

## Validation — September 15, 2026

- Typecheck passed.
- Targeted ESLint passed with zero errors or warnings for all changed application code, schema-preparation script and AR tests.
- Full suite: **230 tests passed across 10 files**, including 32 AR transaction/governance cases and 14 strict client/paging cases. Existing accounting tests were not weakened.
- Isolated production build passed, including /ar and /api/ar. The nested validation copy emitted Next's multiple-lockfile workspace-root warning.
- Browser suite: **7 passed**, including AR visibility, read-only/cross-company/CSRF denial, browser credential exclusion, production authentication/logout and existing accounting workflows.
- git diff --check passed. Validation used an ignored copy without application environment files, mocked ERP HTTP responses and disposable MongoDB replica sets. No live ERP request or production access occurred.

Concurrent globals.css and finance-page.tsx edits were preserved. The auth browser link selector accepts the existing Sign in label with or without its decorative arrow; all authentication/security assertions remain intact. Changes are uncommitted for review; no deploy, push or accounting setup against persistent data was performed.

## Bounded live-validation follow-up

See [live-validation status](PIONEER_AR_LIVE_VALIDATION.md) and [mapping review](PIONEER_AR_LIVE_MAPPING_REVIEW.md). The September 15 follow-up verified the dedicated local development target and disabled gate, but found no configured live ERP origin, dedicated key or explicit AR company binding. No live request/import has occurred. The safe local COA is not the reviewed production COA. A regression fix now rejects authoritative ingestion itself while disabled; parallel projection remains available. These findings do not constitute accounting acceptance.

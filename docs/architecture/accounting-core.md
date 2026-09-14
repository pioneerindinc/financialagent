# Implemented accounting core

## Companies

Company `_id` is a permanent, predefined business identifier: `pioneer-industries`, `317-graphics`, `headquarters-on-main`, `fish-properties`. These values are identifiers, not editable name-derived slugs. Renaming a business must retain its ID. Explicit bootstrap uses upsert with insert-only business settings; it never resets existing names, fiscal settings, or financial records. Fiscal year defaults to January 1 and must be confirmed before live accounting. Display name, short name, active status, USD base currency, fiscal start, timestamps and actor metadata are retained. It creates no accounts, periods, opening balances or sample transactions.

All authoritative child records carry companyId. Authorization checks both company membership and operation scope before database access. Accounts, periods, journals, reports and audit records never use a caller-provided unscoped lookup. Company listing is limited to verified identity assignments.

## Accounts and periods

Accounts have UUID IDs, company, immutable code/type, name, free-form subtype, active flag, optional parent, `controlAccount`, `allowManualPosting`, revision and audit timestamps/actors. Code is unique within company; other companies may reuse codes. Asset/Liability/Equity/Revenue/Expense are the five types. Code/type changes are prohibited for all accounts, including unused ones: this deliberately avoids reclassification of UUID-referenced history and unstable integration mappings. No deletion API exists. Reports retain debit-positive signed net balances and include inactive accounts.

Normal creation defaults to controlAccount=false and allowManualPosting=true. If controlAccount=true is explicitly requested at creation and manual policy is omitted, allowManualPosting defaults to false. Explicit true remains allowed for approved adjustments. Existing stored records lacking fields read as false/true (revision zero), including legacy controls lacking a manual policy; no migration or write-on-read occurs. Runtime manual checks reject explicit false while missing legacy values remain allowed.

POST `/api/finance` action `account.edit` requires companyId, account id, current revision, nonblank reason and a strict partial data object. Allowed fields: name, subtype, parentId (null removes), active, controlAccount, allowManualPosting. All other fields, including code/type/companyId/revision inside data, are rejected. Human finance:write and company membership are required. The company transaction serializes edits against journal posting and other edits; stale revisions return 409. Edits increment revision/update attribution and commit an account.edit audit containing before/after and reason atomically. Creator attribution is retained.

Parent must remain in the same company and type; the ancestor chain is checked to reject self/descendant cycles. Inactive parents remain allowed, consistent with creation; parentage is organizational and does not roll balances up or imply posting permissions. Enabling control metadata on an existing ordinary account requires an explicit manual-posting choice. Control is descriptive; allowManualPosting is authoritative. The UI suggests disabling manual posting when control is selected but permits explicit override.

Deactivation is permitted even with existing balances/drafts, preserving historical reporting. It blocks new manual and source drafts and posting of pending drafts; reactivate through an audited edit or replace draft lines where allowed. It does not clear balances, close periods or alter existing journals. Operators must review unsettled balances and drafts before deactivation. Exact reversals are the narrow exception described below.

### Manual versus authenticated source provenance

New drafts store a server-assigned `postingOrigin`: human-created drafts are manual, service-created drafts are source. The strict input schema rejects caller-supplied postingOrigin. Changing sourceSystem text cannot confer source authority. Service requests still need finance:source:write, company assignment and valid credentials; source drafts still require human review/posting. For old journals without postingOrigin, server-written createdBy with a service: prefix identifies source creation; other/unknown attribution defaults to manual. Human-authored legacy journals labelled with an ERP source name remain manual for account-policy checks.

Manual draft creation/edit and normal posting require active company-owned accounts with allowManualPosting not false. Posting rechecks current policy, so restricting an account blocks pre-existing manual drafts. Source drafts may use active nonmanual/control accounts; inactive accounts are rejected both on source creation and final posting. Source drafts cannot be manually edited, even if their sourceSystem is labelled manual. Source identity/hash deduplication is unchanged: retrying a previously accepted event returns that existing record even after account deactivation, but cannot newly post a blocked draft.

The existing reversal service is a system correction path (`postingOrigin=system`): human finance:write, same-company posted original, exact opposite lines, one reversal only, required reason and open target period. It deliberately permits historical inactive/nonmanual accounts because it accepts no caller-supplied replacement lines. This is not a general system-journal posting bypass. Journal balancing, idempotency, source identity, posted immutability and period behavior are unchanged.

Periods have company, inclusive calendar start/end dates, open/closed status, timestamps, creator/updater, and closedAt/closedBy. Date strings are validated real ISO calendar dates; no local-midnight conversion occurs. Period overlap is rejected. Period creation, closure and posting serialize through the same company document inside transactions. Closing has no reopen API in this phase. Drafts may exist in closed periods, but cannot post there. Year-end transfer automation is future work.

## Journals and lines

Journals have UUID IDs, company, transactionDate, description, source identity, source fingerprint, draft/posted status, revision, created/updated timestamps and actors, postedAt/postedBy, server-derived UTC postingDate, and optional reversalOf. Lines are embedded atomically inside the journal and inherit its company and entry ID. Each has accountId, debitCents, creditCents, memo. Two to 500 lines are accepted. Exactly one side must be positive per line; both-positive and zero/zero lines are rejected. Totals must balance even on draft save.

Transaction date determines accounting-period eligibility and financial report inclusion. Posting date is processing metadata, not the financial effective date. All referenced accounts must be active and in the same company at draft creation/edit and posting.

Manual drafts are editable with optimistic revision checks. Source identity never changes. Imported drafts are not manually editable: source corrections require a new revision and a deliberate correction process. Posting requires a human finance:write actor and the reviewed draft revision. It is idempotent after posting. Posted lines and amounts have no editing or deletion service/API.

## Reversal policy

The original posted record remains byte-for-byte unchanged, including status and timestamps. Reversed status is derived from a linked posted reversal rather than mutating the original. A reversal is a separate posted journal, with swapped debit/credit amounts, its own actor/timestamps/reason and reversalOf. A unique partial index on company/reversalOf prevents duplicate reversal. Reversing a reversal is prohibited in this phase. Corrected journals are separate drafts requiring review and posting.

A reversal requires an open period on its own transaction date. An original from a closed period can be reversed in a later open period. Historical accounts can be used by the reversal even if subsequently inactive, so corrections can faithfully offset posted history. Repeated reversal requests fail with conflict.

## Idempotency

Unique key: companyId + sourceSystem + sourceType + sourceId + sourceRevision. Each field is required, bounded and case-sensitive. Validated input is fingerprinted with SHA-256. Identical delivery returns the existing draft or posted result. Changed content under the same key fails with HTTP 409. A manual edit retains the original delivery fingerprint so retries of the original creation request cannot create a second entry. Source revisions are distinct events, not automatic replacement instructions: future adapters must explicitly decide reversal/correction treatment.

The reserved `financialagent-reversal` source namespace is available only to the reversal service. All company writes acquire a transactional company lock. Unique indexes provide durable duplicate protection, including concurrent requests. Transactions require a replica set or sharded deployment; standalone MongoDB is unsupported. No fallback to nontransactional writes exists.

## Exact money and reports

Journal entry/edit fields accept dollar amounts such as `123.45`, labelled Debit ($) and Credit ($). Blank unused sides mean zero. Conversion uses decimal-string parsing and BigInt, never floating-point multiplication/rounding; more than two decimal places, negative values, exponent notation, currency symbols/group separators and unsafe totals are rejected. Existing draft cents format back into exact dollar strings. API payloads and persisted ledger amounts remain integer `debitCents`/`creditCents`; integrations do not change units.

USD cents are safe JavaScript integers, persisted as BSON numbers. Although BSON uses numeric representation, every monetary value is an exact integer within ±9,007,199,254,740,991 cents; fractional and unsafe values are rejected. Addition and subtraction guard overflow. Formatting uses BigInt division/remainder to avoid decimal rounding. Individual journal sides are nonnegative; report net balances can be negative. There is no floating-point decimal-dollar arithmetic and no FX conversion.

Trial Balance includes only posted journals with transactionDate <= asOf, including both original and reversal. Per-account debit-positive net is split into debit or credit balance, with checked totals. Zero-balance accounts remain visible. Drafts never contribute.

General Ledger includes posted entries by inclusive date range and optional company-validated account. Ordering is transactionDate, createdAt, ID, then embedded line order. Running balance is per-account debit-positive and includes activity before the requested start date. Source metadata and journal links remain visible. Original and reversal are both included on their respective dates.

Reports use snapshot transactions, read full matching history and fail on unsafe totals; they do not silently truncate or approximate amounts. Indexed company/status/date access is provided. Pagination, streaming and report materialization are future scale work. Journal activity UI lists the newest 100 entries; this limit does not apply to reports. Journal detail derives a reversedBy link without modifying the original stored entry.

## Audit and trust boundary

Audit rows are written in the same transaction as account/period/journal mutations. Manual draft edits retain before/after snapshots. Actor strings distinguish human and service. Reversal links, source identity, processing timestamps and reasons remain attributable. Audit has no application mutation/deletion endpoint. Direct database administrators remain privileged; this is not a tamper-proof external audit archive. Database access must be restricted to the application and approved operators.

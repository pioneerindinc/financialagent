# Implemented accounting core

## Companies

Company `_id` is a permanent, predefined business identifier: `pioneer-industries`, `317-graphics`, `headquarters-on-main`, `fish-properties`. These values are identifiers, not editable name-derived slugs. Renaming a business must retain its ID. Explicit bootstrap uses upsert with insert-only business settings; it never resets existing names, fiscal settings, or financial records. Fiscal year defaults to January 1 and must be confirmed before live accounting. Display name, short name, active status, USD base currency, fiscal start, timestamps and actor metadata are retained. It creates no accounts, periods, opening balances or sample transactions.

All authoritative child records carry companyId. Authorization checks both company membership and operation scope before database access. Accounts, periods, journals, reports and audit records never use a caller-provided unscoped lookup. Company listing is limited to verified identity assignments.

## Accounts and periods

Accounts have UUID IDs, company, code, name, Asset/Liability/Equity/Revenue/Expense type, free-form subtype, active flag, optional parent and audit timestamps/actors. Code is unique within company; other companies may reuse codes. Parent must be same company and type. No account deletion or reparenting API exists. Normal debit balance applies to Assets and Expenses; others normally carry credit balances. Reports retain debit-positive signed net balances rather than hiding unusual balances.

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

USD cents are safe JavaScript integers, persisted as BSON numbers. Although BSON uses numeric representation, every monetary value is an exact integer within ±9,007,199,254,740,991 cents; fractional and unsafe values are rejected. Addition and subtraction guard overflow. Formatting uses BigInt division/remainder to avoid decimal rounding. Individual journal sides are nonnegative; report net balances can be negative. There is no floating-point decimal-dollar arithmetic and no FX conversion.

Trial Balance includes only posted journals with transactionDate <= asOf, including both original and reversal. Per-account debit-positive net is split into debit or credit balance, with checked totals. Zero-balance accounts remain visible. Drafts never contribute.

General Ledger includes posted entries by inclusive date range and optional company-validated account. Ordering is transactionDate, createdAt, ID, then embedded line order. Running balance is per-account debit-positive and includes activity before the requested start date. Source metadata and journal links remain visible. Original and reversal are both included on their respective dates.

Reports use snapshot transactions, read full matching history and fail on unsafe totals; they do not silently truncate or approximate amounts. Indexed company/status/date access is provided. Pagination, streaming and report materialization are future scale work. Journal activity UI lists the newest 100 entries; this limit does not apply to reports. Journal detail derives a reversedBy link without modifying the original stored entry.

## Audit and trust boundary

Audit rows are written in the same transaction as account/period/journal mutations. Manual draft edits retain before/after snapshots. Actor strings distinguish human and service. Reversal links, source identity, processing timestamps and reasons remain attributable. Audit has no application mutation/deletion endpoint. Direct database administrators remain privileged; this is not a tamper-proof external audit archive. Database access must be restricted to the application and approved operators.

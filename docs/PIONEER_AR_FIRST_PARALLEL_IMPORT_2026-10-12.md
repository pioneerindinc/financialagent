# Pioneer ERP first parallel import — acceptance report

**Accepted — October 12, 2026.** The authorized development-only import of October 1–12 created **36 review-only invoice projections and 36 source versions**, comprising **158 lines / $43,501.32**. No accounting drafts, journals, payment applications or financial balances were created or changed. Authoritative AR remains disabled.

## Authorization and operation

The user explicitly authorized the first controlled PARALLEL import for company `pioneer-industries`, contract `pioneer-customer-invoices-v1`, from `2026-10-01` through `2026-10-12`, with expected totals of 36 invoices / 158 lines / $43,501.32. This authorization did not extend to authoritative accounting.

One authenticated `POST /api/ar` was submitted with action `sync`, mode `parallel`, company `pioneer-industries`, and query `{from:"2026-10-01",to:"2026-10-12",limit:50}`. The supported development session, human finance:write authorization, company binding, origin checks and existing `syncInvoices -> importScan -> write` transaction were used. No database write was issued directly by the investigation script.

Service result: **imported=36, replayed=0, complete=true, mode=parallel**. Independent acceptance verification completed **2026-10-12T18:46:29.603Z** (2:46:29 PM EDT). No partial failure occurred and no import retry was submitted.

Audit actor: `human:dev:local-finance`. Each of the 36 `ar.import` audits contains the reason:

> User-authorized first controlled development PARALLEL import for Pioneer Industries, 2026-10-01 through 2026-10-12: expected 36 invoices, 158 lines, USD 43501.32; mapping v2 (169 rules), AR 1100. Review-only projections; no authoritative AR, drafts, journals, payments or ERP writes.

## Preflight evidence

- Exact approved URI: `mongodb://127.0.0.1:27291/financialagent_dev?replicaSet=financialagent-dev&directConnection=true`. Local authenticated lifecycle controller and MongoDB hello verified the workspace, database, port and replica set. No production database was accessed.
- Development auth enabled; exact HTTPS application origin `https://127.0.0.1:3445`; ERP origin `http://127.0.0.1:3000`; company binding `pioneer-industries`; authoritative mode false. Running application checks confirmed the same mode and mapping.
- Existing backup `C:\Dev\financialagent\.local\backups\financialagent-dev\20261012T164114Z` remains present. All **24 checksum entries passed**, including the manifest. Its earlier isolated-restore verification remains recorded. No restore or new backup was performed; this backup predates account 4500, mapping version 2 and this import.
- Persisted mapping version **2**, **169 rules**, AR control **1100 Accounts Receivable**, truck income **4500 Trucks**, shipping **4400 Shipping**. All six relevant accounts met existing company/type/active/posting safeguards; 1100 is Asset/control with manual posting disabled.
- Mapping configuration hash remained `111f725a54999c622bfa2476236c567ae9ad557e4c4449ab536e98c588b4be88`; no account or mapping changes were needed.
- Fresh complete strict v1 scan returned the expected 36 invoices / 158 lines / $43,501.32 in one page. Every record passed contract and pure readiness checks; every line resolved. No truncation or incomplete scan occurred.
- Comparison with stored data found **36 new identities, zero existing identities and zero existing versions**. Unique indexes were present. Journals were empty. Repeated whole-database fingerprints matched immediately before submission.
- Neither anonymous-freight invoice (May 21/29) nor fractional-price invoice (June 22/July 14) falls in this window. Zero known exceptions were imported.

Code inspection established the safety of this **empty-baseline** parallel path: it inserts heads, versions and import audits under a company transaction, evaluates readiness and adds the mandatory non-authoritative issue. It does not call journal creation, posting, payment application or balance updates. There were no old versions, so its revision-supersession/draft-supersession branch was not reached. This is not a claim that every future synchronization of already-drafted invoices has no draft effects.

## Persisted coverage and review status

| Revenue target | Imported lines | Source line value |
| --- | --- | --- |
| 4100 Repair | 71 | $15,634.56 |
| 4200 Parts | 59 | $20,153.62 |
| 4300 Equipment | 9 | $5,225.00 |
| 4400 Shipping | 19 | $2,488.14 |
| 4500 Trucks | 0 | $0.00 |
| **Total mapped** | **158** | **$43,501.32** |

All imported records have **mode=parallel**, **status=needs-review**, and exactly one issue:

> Parallel / non-authoritative: projection only; no journal or opening AR

There are no other source or mapping readiness issues in this window. The review status is intentional. All 36 head-to-version links and company/source-family identities were verified; each head points to its sole version. No duplicate source identity or invoice/revision pair exists.

The retained source payload intentionally omits operational context, as designed by the existing service. Every other retained field matched the fresh export, each originalAmountCents matched the source total, and the stored fingerprint matched the complete validated source record using the service's canonical hashing algorithm.

Source scan revision, identical before import, in the service result and audit records, and in the fresh post-import scan:

`7bdaee65dcedb8e623bda2ba5225772dc2e68f18f503339311e8a446b3e65e7b`

All 36 stored sourceRevision values matched that post-import live export. Three diagnostic scans—preflight, immediately before submission and after import—each completed with one GET; the audited service also fetched its own complete source scan.

Coverage was evaluated independently against unchanged persisted mapping version 2. Projection versions intentionally have no journalId, arAccountId or mappingVersion fields populated; those are populated by the separate accounting-draft path. Do not interpret this import as fixing accounting account assignments or recognizing AR.

## Before/after invariants

| Collection / invariant | Before | After | Verified change |
| --- | --- | --- | --- |
| accounts, including bank/control accounts | 53 | 53 | All documents unchanged |
| arinvoices | 0 | 36 | 36 new Pioneer projections |
| arversions | 0 | 36 | One new parallel version per projection |
| armappings | 2 | 2 | Both versions unchanged; latest remains version 2 |
| audits | 61 | 97 | 36 new ar.import audits; previous audits unchanged |
| companies | 4 | 4 | Pioneer lockVersion **6 -> 7**, updatedAt only; other company fields/documents unchanged |
| journals, including drafts and posted entries | 0 | 0 | None created |
| periods | 0 | 0 | Unchanged |
| auth_attempts | 8 | 8 | Unchanged |
| auth_sessions | 4 | 4 | Unchanged |
| auth_users | 1 | 1 | Unchanged |

All 11 namespaces were compared using BSON-typed document fingerprints. No records were deleted, no preexisting financial/account records changed, and index definitions and namespace inventory were unchanged. The only changes were the 36 heads, 36 versions, 36 audits and expected Pioneer company-lock/timestamp update. Verification itself caused no further database changes.

All 36 new audits uniquely link to their imported versions and verify invoice/source identity, source revision, full fingerprint, mode, status, exact window and scanRevision. No draft, posting, supersession or payment audit was added. The supported development login is stateless and created no auth database records.

The final authenticated AR overview shows all 36 projections, no next page, **recognized receivables $0.00**, and no posted or reversal journal IDs. There are no separate payment, bank-transaction or customer-balance collections in this database inventory. Bank account records and all non-import collections remained unchanged; no payment or balance service was invoked. Source invoice value is review evidence, not a booked AR balance or proof of remaining customer debt.

## Acceptance and remaining boundaries

**Import accepted.** All requested counts, classifications, source revisions, audits and financial invariants passed. The prior annual exceptions remain outside this imported window and unresolved: two anonymous freight lines and two invoices with fractional-cent unit prices. Nothing in ERP was corrected or written back.

Review is available at `https://127.0.0.1:3445/ar?company=pioneer-industries` through normal development sign-in. Do not use a draft/posting action or enable authoritative mode. Future imports, source corrections, payment reconciliation or authoritative accounting require separate authorization and their existing safeguards.

Only this acceptance report and the expanded report's current-status pointer were updated in the repository. No application/configuration code, migration, service restart, deployment or commit was performed. Unrelated modified and untracked files were preserved.

**Stopped after import verification; no authoritative accounting followed.**

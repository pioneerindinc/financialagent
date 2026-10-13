# Pioneer AR authoritative readiness

Assessment: 2026-10-12. Development only. **NOT READY for authoritative AR.** Ready for a separately approved, read-only settlement reconciliation contract and report. Do not post the 444 historical invoice face values or enable authoritative AR.

## Verified baseline and investigation boundary

- Financial Agent: `financialagent_dev`, `127.0.0.1:27291`, replica set `financialagent-dev`. Workspace controller identity and environment guards verified; authoritative AR remains disabled.
- Approved ERP development: `equipment_tracker_dev`, `127.0.0.1:27119`, replica set `cfoFixture`. Existing development policy and protected URI fingerprint accepted the connection unchanged. No production or alternate database was accessed.
- Fresh strict `pioneer-customer-invoices-v1` GET scans covered 2025-10-13 through 2026-10-12 in 13 complete monthly/partial-month windows. All 444 identities, revisions and retained invoice fingerprints matched Financial Agent.
- 444 parallel / needs-review projections, 444 versions, 3,368 lines, $851,377.77 captured source value; 169 mapping rules at version 2, AR control 1100. Mapping coverage remains 3,366 lines / $849,650.98. Four flagged invoices remain.
- “Original invoice value” here means the retained source value at import. ERP exports `immutableOriginalAmountCents: null`; it does not establish an immutable amount originally issued.
- Native database reads used bounded metadata projections, not application initialization or mutation services. No authentication/session writes were needed. No raw customer names or payment narratives are included here.

Verification at 2026-10-12T19:04:31.139Z: Financial Agent's complete collection/document/index snapshot hash was unchanged before and after:
`e3cf3d85fadc8df3d67b2f9c6f729959d2cfc1d8ffd61fcbf26996494cb436e8`.
ERP payment/identity metadata was also unchanged across the read:
`33941773c2d53c14a898bc60b8d179f46bf447c75383d4f9dd1d5b2eeb1177fd`.
These prove stability during the observation, not completeness of historical bookkeeping.

| Financial Agent collection | Before | After |
|---|---:|---:|
| accounts | 53 | 53 |
| arinvoices | 444 | 444 |
| armappings | 2 | 2 |
| arversions | 444 | 444 |
| audits | 505 | 505 |
| auth_attempts | 8 | 8 |
| auth_sessions | 4 | 4 |
| auth_users | 1 | 1 |
| companies | 4 | 4 |
| journals | 0 | 0 |
| periods | 0 | 0 |

The two mapping documents are historical version 1 and active version 2. Pioneer company lock remains 16. No journals exist, including drafts. There are no receipt, payment-application, customer-credit, opening-AR or bank-record collections in this database. Account/company documents, mappings, audits, sessions and all other existing records were unchanged.

## Current application capabilities

| Capability | Finding |
|---|---|
| Source invoices and revisions | Complete scans, strict validation, retained projections, source versions, mapping and duplicate/replay controls exist. |
| Ordinary authoritative invoices | Gated draft creation debits AR and credits mapped revenue for the full invoice. Human posting and current-source/current-mapping/account checks apply. |
| Existing historical projections | Parallel mode cannot draft/post. Pre-2027 invoice dates require a separate reconciled opening migration. Replaying the same revision cannot promote its mode. |
| Corrections | Source revision and posted-document correction/reversal safeguards exist; these are not a receipts or credit-memo subledger. |
| Customer receipts/applications | No implemented customer receipt/application subledger or allocation workflow was found. AR overview explicitly returns payment status “not-tracked” and remaining balance null. |
| Credits, write-offs, refunds, unapplied cash | No dedicated AR lifecycle implementation was found. Generic journal/reversal functionality is not an invoice-linked settlement system. |
| Opening AR and cutover | No implemented opening-item migration, reconciliation batch or historical promotion workflow. Planned boundary is 2027-01-01; QuickBooks remains official through 2026-12-31. |
| Current balances | Zero recognized AR journals does **not** establish zero customer debt. No FA customer receipts, credits or opening receivables were found. No accounting periods exist yet. |

Account 1100 is an active Asset control account with manual posting disabled. Do not use generic journals to bypass that safeguard or the missing opening-item design. Creating periods or changing an environment flag would not establish accounting readiness.

Implementation evidence: [AR service](../src/domains/ar/service.ts), [posting safeguards](../src/domains/ar/posting.ts), [readiness](../src/domains/ar/readiness.ts), [source contract](../src/domains/ar/contract.ts), [models](../src/models/index.ts), [cutover dates](../src/lib/accounting-cutover.ts), and [2027 accounting plan](PIONEER_2027_ACCOUNTING_SETUP.md).

## ERP settlement evidence and reliability

ERP's `CustomerPayment` model supports posted/voided entries of type payment or credit, dollar amounts, unapplied amounts and invoice applications. Applications identify invoice family, number and optional parent reference; they have no independent application ID. There is no distinct write-off classification in this model. Credit entries cannot be assumed to be write-offs, refunds or cash.

The approved development data contains:

| Evidence | Count / amount |
|---|---:|
| Posted entries; voided entries | 183; 0 |
| Payment entries | 172 / $527,979.46 |
| Credit entries | 11 / $4,645.98 |
| Applied cash | $527,913.93 |
| Applied credits | $2,643.11 |
| Total applications | 269 / $530,557.04 |
| Unapplied cash | $65.53 |
| Unapplied credits | $2,002.87 |
| Application date coverage | Entry payment dates 2026-05-07 through 2026-10-09 |

All 183 entries reconcile amount = applications + unapplied amount in cents. All 269 applications match exactly one current source invoice using family + invoice number + parent reference; all have matching customer IDs. No invalid cent amounts, unmatched applications, ambiguous legacy applications, overapplied invoices or customer conflicts were observed. This establishes structural consistency of the current records, **not bank reconciliation or completeness**.

No entry has a bank-transaction link; only one has an account link. None has the inspected Finance-confirmation or CFO-payment linkage. Absence of voided records does not establish that no historical reversals occurred. Receipt/payment evidence must still be reconciled to QuickBooks, bank evidence and customer documentation.

### Invoice-level reconciliation

| Current evidence category | Invoices | Invoice face value | Provisional remaining |
|---|---:|---:|---:|
| Fully covered by applications, including credits | 258 | $527,041.08 | $0.00 |
| Partially covered | 2 | $6,289.55 | $2,773.59 |
| Positive value, no application evidence | 180 | $318,047.14 | $318,047.14 if assumed unpaid |
| Zero-value invoices, no applications | 4 | $0.00 | $0.00 |
| Total | 444 | $851,377.77 | **$320,820.73 provisional only** |

260 invoice identities reconcile to application records; 184 have no application records. The latter include four zero-value records and 32 historical repair invoices discussed below. The current ERP canonical identity crosswalk is unique for all 444 exports: 362 canonical-source identities and 82 Finance-invoice-ID identities. Three family/invoice-number combinations repeat across parents, so invoice number alone is unsafe. Preserve both exported source ID and canonical parent identity in a future reconciliation contract.

The two partially applied source identities are:

| Source ID | Family / date | Face | Applied cash | Remaining |
|---|---|---:|---:|---:|
| `ffd799b478cca5a1c01c2f736ba05b2f97f37c540d67233d458cd0ea541d40e4` | Repair / 2026-07-01 | $4,708.06 | $2,000.00 | $2,708.06 |
| `32cee41d7f5948ea6efd89f4433ebc733f82e982923f37107d593c28273e17db` | Part sale / 2026-08-20 | $1,581.49 | $1,515.96 | $65.53 |

Six invoices have credit applications: one entirely covered by credit and five by cash plus credit. Source IDs:
- `e2f8e43ae14eb3cf890028c55d94be1d4c633f69b6c240d0e3cb5fd04cb65b46`
- `88b90be190c4ef9c0bbe74fdd9b86691185f080638e6d71ad7f184ccdbf6da58`
- `d69ebfcace3132f264887e7af8f441c6c37159847b162a930c5f756a13b973d7`
- `d9a546b9093ee20fe08d2f170e1c2103c41c82aa5ba52f4ee1ed7c40932dae81`
- `9d4df536bde69df260df28800ff6db531a4e2fccf2a1b74722282a8a9ecc6ebc`
- `d4344d26eb84fafddf104099f7191239370642891e16c0008a42319ed6d2fe28`

Do not equate the $65.53 partial residual with the equal aggregate unapplied cash without proving customer ownership and intended allocation. No allocation was performed.

### Material historical balance inconsistency

ERP `src/lib/finance.ts:listCustomerInvoiceBalances` treats repair invoices issued before 2026-04-07 00:00 EDT as fully applied by default, without requiring payment evidence. **32 current invoices totaling $118,891.17 fall in this group; none has a recorded application.** They are part of the 180 positive invoices above.

By contrast, `src/lib/cfoSourceStore.ts` flags historical repairs as requiring opening-balance review and derives paid amounts from actual applications. It combines payment and credit applications in “paidCents.” The operational view also clamps negative residuals to zero, while the CFO path flags overapplication.

Subtracting the historical default from the evidence-only residual would yield $201,929.56; this is an illustration of the policy discrepancy, not a verified collectible balance or a called operational API result. Neither figure is approved opening AR. Resolve these 32 invoices individually against official records. No evidence supports marking them paid or unpaid categorically.

### Contract gaps

- Strict Financial Agent invoice v1 exports no settlement history, paid/credit/write-off breakdown or outstanding balance. Payment changes intentionally do not change its invoice revision. Repeated invoice scans cannot synchronize settlement.
- ERP CFO documents expose derived paid/open values but combine credits with payments and do not supply the required immutable, as-of settlement ledger through this integration.
- `finance-payment-confirmation-v1` and CFO payment-confirmation routes are **inbound writeback**, not read-only ERP settlement feeds. They do not implement FA receipts. The newer receiver is restricted to a separate writeback-test database and requires an incompatible account-ID catalogue; it was neither invoked nor bypassed.
- Current mutable posted/voided records do not establish full historical effective-date, void/reallocation or write-off history. No reliable historical as-of balance can be certified from this snapshot alone.

ERP code inspected read-only under `C:\Dev\equipment-tracker`: `src/models/CustomerPayment.ts`, `src/models/invoicePaymentFields.ts`, `src/lib/financialAgentInvoices.ts`, `src/lib/finance.ts`, `src/lib/cfoSourceStore.ts`, `src/lib/financePaymentContract.ts`, `src/lib/financePaymentReceiver.ts`, `src/lib/cfoPayments.ts` and their integration routes.

## Four source exception dispositions

All four currently have exact, customer-consistent cash applications equal to their full invoice values, with no applied credits. Independent settlement confirmation remains required.

| Exception / exact source ID | Existing issue | Disposition |
|---|---|---|
| F1: `5b88de8667a08bf92b9868c8ad9805214f0ebb9256649eb3fe09af43820a384e` | 2026-05-21 standalone, parent `6a0f305551594cd711a05c13`, line 0: unidentified zero-value freight placeholder; separate mapped shipping $767.19. | Blocks ordinary invoice readiness because an unmapped line remains. If settlement confirmed, retain nonposting history with flag; no opening receivable. No catch-all rule needed to erase history flag. |
| F2: `bd7ef605fa42aecbba4971c3efcf9a7354a4fb91d6d669bdb442cb17342732ee` | 2026-05-29 standalone, parent `6a199c092c2ea5a34a57b01b`, line 0: unidentified freight $1,726.79. | Blocks ordinary posting; valid free-text source line lacks mapping identity. If future posting required, obtain stable reviewed source identity and classification. If settlement confirmed, retain nonposting history. |
| Q1: `4a80c819407776c65393408feb794f5ec424168a813e8438038c55c336693a46` | 2026-06-22 part sale, parent `6a0dfba422169580f8d6edb0`, line 0: quantity 66 × $17.5133 = rounded $1,155.88; v1 integer-cent unit price is null. | Valid rounded source extension, unsupported unit-price representation for authoritative checks. Do not round unit rate to cents. If settlement confirmed, retain nonposting history. |
| Q2: `261c0c64deff8d3aad1e895b4e10cd385f22b8e238c86f6bb87659592b8c8b0f` | 2026-07-14 part sale, same parent, line 0: quantity 334 × $17.5133 = rounded $5,849.44; unit price null. | Same precision-contract issue as Q1; review flag may remain on settled nonposting history. |

All four pass the source transport schema and preserve source totals accurately. None is approved for ordinary authoritative invoice posting. A separately designed opening-item workflow would depend on reconciled residuals, not reposting historical line revenue; no such workflow is currently implemented. If settlement evidence changes, reassess disposition.

## Proposed controlled cutover

1. **Keep historical projections nonposting.** Do not draft the $851,377.77 historical face value, change modes on replay, or reproduce historical receipts as new bank deposits.
2. Build a development-only read-only settlement contract and reconciliation report. Require exact tenant/customer/invoice identity, stable receipt and application IDs, cash versus credit/write-off/refund distinctions, currency and exact amounts, unapplied amounts, effective dates, reversal/void/reallocation history, revisions, complete pagination and a consistent as-of snapshot. Explicitly identify unavailable evidence.
3. Reconcile each invoice and credit to official QuickBooks AR detail and supporting receipts/bank evidence. Resolve the 32 historical repair assumptions, 180 positive invoices without applications, six credit-covered invoice identities, two partial balances and unapplied items. Confirm completeness beyond this one-year invoice window; older open items may exist.
4. Obtain approved 2026-12-31 trial balance, customer aging/open-item detail, credit/unapplied-cash schedules and late adjustments. Today's October snapshot cannot establish year-end opening balances. Include October 13–December 31 activity and agreed treatment of later-entered, backdated changes.
5. Design a separately audited opening-AR migration at 2027-01-01 that records **only confirmed remaining receivables** and preserves original invoice/customer/source crosswalks. Coordinate its AR control posting with the opening trial-balance migration so 1100 is recorded once. Use a reviewed balanced opening design, not a plug account or recreated 2026 revenue.
6. Carry confirmed unapplied cash/credits through separately approved opening treatment, without inventing allocations, netting unrelated customers or recording cash twice. Define credit, return, write-off, refund and payment reversal authority before enabling customer settlement operations.
7. Keep settled historical invoices as linked nonposting history. Post ordinary new post-cutover invoices only through the approved authoritative workflow after cutover controls, periods, receipt lifecycle, reconciliation and recovery tests are ready.
8. Use a dated approved migration manifest, immutable baseline/backup, dry run, idempotency controls, reconciliation gates, explicit authority ownership and a rollback/correction plan. Require AR subledger = control account = approved opening aging before activation. No switch or migration is authorized by this report.

## Decisions and development acceptance gates

| Decision / gap | Required approval or evidence |
|---|---|
| System of record and cutover date | Confirm QuickBooks through 2026-12-31 and planned FA start 2027-01-01; define ownership of late adjustments and customer payments. |
| Historical repairs | Invoice-level settlement/opening determination for 32 records; retire neither policy nor data without reviewed evidence. |
| Missing settlement evidence | Official reconciliation for 180 positive records; no-application is not an unpaid classification. |
| Credits and write-offs | Identify nature/authority of credits, whether write-offs/refunds exist elsewhere, and their accounting treatment. |
| Unapplied items | Confirm $65.53 cash and $2,002.87 credit ownership, validity and opening treatment. |
| Opening migration | Accountant-approved residual balances, opening offset/GL coordination, historical identity links and duplicate prevention. |
| Source exceptions | Preserve four flags; approve settlement-based nonposting disposition or separate source/precision correction if required later. |
| Receipt lifecycle | Implement controlled receipt, allocation, reversal, refund/credit/write-off and unapplied-balance behavior before relying on FA as authoritative AR. |

Required tests for the next read-only contract: exact identity joins despite duplicate numbers; customer/tenant rejection; cash and credit separation; partial and unapplied balances; the historical repair assumption must not fabricate settlement; precision; void/reversal and backdated as-of changes; complete-pagination failure without partial success; stable payment/application IDs and independent settlement revisions; no database or accounting writes.

**Next recommended development step:** separately authorize the read-only settlement contract and reconciliation report, accompanied by official AR/payment evidence. Do not enable payment writeback, opening balances or authoritative invoice posting. The observed current ledger is internally consistent, but historical completeness, bank support, year-end balances and the required FA settlement/opening capabilities remain unproven or absent.

## Evidence and limitations

Related accepted reports: [historical import](PIONEER_AR_HISTORICAL_PARALLEL_IMPORT_2026-10-12.md), [expanded mapping and exceptions](PIONEER_AR_EXPANDED_MAPPING_COVERAGE_2026-10-12.md), [current mapping proposal](PIONEER_AR_CURRENT_BASELINE_MAPPING_PROPOSAL.md).

This assessment confirms current development data and inspected code behavior only. It does not assert production balances, completeness of QuickBooks/payment history, that missing records were deleted, or that any customer balance is collectible. No recovery, import, configuration change, journal, draft, receipt, application, migration, restart or production access occurred.


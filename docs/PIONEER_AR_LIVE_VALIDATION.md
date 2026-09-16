# Pioneer AR mapping application validation — 09-15-2026

Approved mappings were applied only to **127.0.0.1:27291 / financialagent_dev / financialagent-dev**, company **pioneer-industries**. Authoritative mode remained false. ERP origin was verified as http://localhost:3000 with an equipment-tracker listener; its configured MongoDB remained local equipment_tracker_writeback_test on port 27119. Dedicated keys matched without disclosure. No production target was accessed.

## Approved account and mapping application

Created only **4400 Shipping Revenue** under the existing 4000 Revenue account's database ID:

| Field | Final value |
| --- | --- |
| Type | Revenue |
| Active | true |
| postingAccount | true |
| controlAccount | false |
| allowManualPosting | true |

1100 AR governance and existing 4100/4200/4300 posting Revenue accounts were verified unchanged. 4000 remained nonposting; 6600 Shipping remained Expense. Account 4400 did not exist at preflight.

Applied one versioned mapping configuration through the audited saveMapping service: preserved equipment-sales -> 4300; added repair-revenue -> 4100, shipping-income -> 4400, 67 exact part-sale item/part-ID pairs -> 4200, and four exact standalone item/part-ID pairs. The review catalog and retained source identities matched completely. No generic part-sale/standalone rule, unmapped fallback, or unapproved item was added.

## Counts and audit

| Record | Before | After application | After replay |
| --- | ---: | ---: | ---: |
| Accounts | 49 | 50 | 50 |
| Journals | 1 | 1 | 1 |
| Periods | 1 | 1 | 1 |
| Audits | 124 | 126 | 126 |
| Mapping records/snapshots | 1 | 2 | 2 |
| Current mapping version | 1 | 2 | 2 |
| Active mapping rules | 1 | 74 | 74 |
| Projection heads | 70 | 70 | 70 |
| Projection versions | 70 | 70 | 70 |

Two normal audits were created: account.create for Shipping Revenue and ar.mapping for the complete approved configuration. Mapping rules have their individual approved reasons and the mapping audit stores the before/after batch. No per-rule database record or per-rule audit is implied by the schema.

Existing version 1 and its equipment rule were preserved; current version 2 includes the same equipment rule unchanged. Account creation and mapping save used the normal domain validation, company serialization, and mapping expected-version check.

## Source replay and preservation

Replayed **08-01-2026 through 09-15-2026**, inclusive UTC invoice dates, using two limit-50 pages: both HTTP 200. The contract also includes undated records, but none appeared.

- Same 70 invoices: 18 repair/shipment, 44 part-sale, 8 standalone.
- Same 456 financial lines: 279 repair, 126 part-sale, 10 standalone, 40 shipping, 1 equipment, 0 unmapped.
- **0 imported, 70 unchanged replays**.
- Every retained payload/source revision matched the response before replay; the importer verified revision fingerprints.
- All projection heads and version documents matched their pre-application snapshots exactly after replay.
- No new source version was created because mappings changed.
- All prior account documents and period documents were preserved.
- Journal count stayed at 1; no accounting draft/post action was called.
- The prior 70/70 exact-cent reconciliation remains valid because all source financial evidence was unchanged. Header shipping is already represented by emitted financial lines and is counted once.

## Mapping readiness versus source readiness

All 70 projections were reevaluated across both API pages, not just the first 50.

| Classification | Count |
| --- | ---: |
| Fully revenue mapped | 70 |
| Partially mapped | 0 |
| Unmapped | 0 |
| Source-data blocked (subset of fully mapped) | 2 |
| No non-mode readiness blockers | 68 |

The two blocked source IDs are:

- e1702486ccfecac56a762c1a334af82bd1eacb02ce92a130d3357300aaf30b87
- ef5a783b8a7b7315575c7993b05dac3c0d46c21a0b85653c57bab91a843d2f7b

Each retains Missing customer identity / missing-customer-identity / missing-customer-record. No inferred customer was supplied.

All 70 retain missing-due-date and terms-snapshot-unavailable; no due dates were calculated from current customer terms. Legacy-source-identity, positional-line-identity, and current-source-amount-not-immutable-original remain on all 70. Original revenue-classification-review flags on 52 invoices remain preserved while the approved exact mappings resolve that review condition dynamically. No amounts, tax/discount nulls, or flags were normalized.

The stored import status remains historical needs-review. Current revenue resolution is displayed separately. Every invoice remains 2026 parallel/non-authoritative and cannot be treated as official FinancialAgent AR, opening AR, or payment truth. No cancellation/changed-revision examples were manufactured.

## UI and checks

Actual local browser review at /ar?company=pioneer-industries passed across 50 + 20 rows:

- Every invoice displays Revenue mapping: all lines resolved.
- 4100 Repair, 4200 Parts, 4300 Equipment, and 4400 Shipping Revenue targets appear.
- All ten standalone lines resolve to the approved target for their exact reference.
- Both missing-customer invoices still display their blockers.
- Source quality flags and a one-version history sample remain visible.
- Parallel/non-authoritative labeling and disabled authoritative option remain.
- Remaining/payment is not tracked; recognized invoice AR remains $0.00.
- No draft/post action or projection journal link appears.

Browser requests were restricted to FinancialAgent loopback and read-only views, except its ordinary development-session sign-in. No browser mapping save or accounting action occurred.

112 tests passed across tests/ar.test.ts, tests/ar-client.test.ts and tests/accounting.test.ts, using disposable database fixtures. No application code changed, so typecheck, lint and production build were not rerun. git diff --check still finds unrelated whitespace in .env.example:9 and src/components/finance-console.tsx:1028; no unrelated cleanup was performed.

## Next step

Revenue mapping gaps in the sampled population are resolved. The next task should be **remaining source-data cleanup**, starting with the two missing-customer linkages. Due dates/terms require a separate provenance and aging/Collections design; positional identity and immutable-original amount remain contract limitations. Unknown future items still fail closed with no fallback.

No Pioneer Managers/Data Quality Manager changes, ERP mutation, production access, authoritative mode, payment/settlement, opening AR, AP, banking, deployment, commit or push occurred.

Changed only docs/PIONEER_AR_LIVE_MAPPING_REVIEW.md and docs/PIONEER_AR_LIVE_VALIDATION.md in the repository; authorized development account/mapping/audit changes are recorded above.

**READY FOR NEXT AR PHASE** — source-data cleanup/design only, not authoritative accounting activation.

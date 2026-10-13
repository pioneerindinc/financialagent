# Pioneer repair revenue allocation — Phase 5 acceptance

2026-10-13. **Phase 5 accepted for the roadmap's initial in-memory ingestion/reconciliation scope. Phase 6 was not started.** The approved roadmap assigns this phase to Financial Agent: separate supplementary ingestion, exact invoice source-revision/line binding, idempotency and completeness checks, with an in-memory simulation first. Later supplementary persistence requires authorized, audited services and is **not part of this implementation**. Allocation evidence cannot create an invoice, alter imported invoice versions or mappings, or post accounting.

## Preflight and contract

The existing `pioneer-customer-invoices-v1` import remains untouched. ERP Phase 4 supplies a separate `pioneer-repair-revenue-allocation-v1` GET feed with strict version-2 evidence, append-only revisions, explicit exceptions, full-window scan revision and cursor. Financial Agent's approved local target remains `financialagent_dev` on `127.0.0.1:27291`, replica set `financialagent-dev`; the environment was checked without displaying its URI or credential. Development sign-in and Pioneer company binding are enabled; authoritative AR is disabled. No running development database was connected or written during this implementation. Database tests used an identity-checked, disposable loopback replica set named `phase5-fixture` and database `phase5_fixture`.

The consumer mirrors the producer's strict wire schema and canonical SHA-256 evidence identity. It checks the dedicated server-side Bearer request, company, contract, date range, bounded response, pagination count/order, scan revision, cursor progress, envelope/content hashes, immutable operation/event/idempotency identities, correction continuity, Indianapolis eligibility and explicit exception status. A 409 restarts the **entire** scan up to three attempts. Any malformed, partial or failed scan yields no reconciled result. The client returns no page until the full scan has validated. No raw customer or credential data is logged.

The pure reconciler compares the latest evidence revision to the **already imported** Pioneer invoice's source ID, exact source revision, first-finalization timestamp, and repair source-line IDs. It independently compares captured component cents and billed repair-line cents. Parts and services retain their separate kinds, contract adjustments and concessions retain signed amounts, and replacement-bottle identity remains in the strict evidence. It does not compute category revenue, apply mappings, or add invoice value a second time. Pre-effective history, direct parts, standalone truck income and complete equipment sales stay outside ordinary repair allocation. An eligible invoice without evidence becomes an explicit `missing-evidence` review with its billed amount; a bound ERP exception remains `source-exception`; an unbound ERP exception remains separately visible and **is not falsely attached** to an invoice. Missing imported invoices, stale revisions, conflicting operations, line mismatches and unreconciled captured values fail closed. A correction that changes invoice binding is rejected pending a separately approved policy.

`simulateImportedAllocationWindow()` requires `finance:read` and Pioneer company access, completes the ERP evidence scan, then reads current imported Pioneer projections in one Financial Agent snapshot transaction. It has no write service, model create/update, audit, mapping or journal dependency. Replay recomputes the same in-memory result and stores nothing. This is a development simulation interface, not a scheduled job, browser import action or persistent allocation store.

## Files changed

- `src/domains/repair-allocation/contract.ts` — strict mirrored producer contract and identity validation.
- `src/domains/repair-allocation/client.ts` — bounded authenticated complete-page GET scan.
- `src/domains/repair-allocation/reconcile.ts` — pure invoice binding, completeness and replay logic.
- `src/domains/repair-allocation/simulation.ts` — authorized, read-only imported-projection snapshot simulation.
- `tests/repair-allocation-phase5.test.ts` and `tests/repair-allocation-phase5-db.test.ts` — contract, failure, replay and isolated database invariants.
- This report.

## Acceptance gates and verification

| Phase 5 gate | Result |
| --- | --- |
| No invoice imports/source-version changes; 169 mappings and 444 historical projections preserved | No existing invoice import, AR service, mapping, model or route was changed. The isolated database test verified invoice/version/mapping counts and the retained source revision and amount were unchanged after simulation. The running development baseline was not modified or reimported. |
| Duplicate replay and allocation-only revisions | Latest append-only revision selected; repeated in-memory replay is identical. Duplicate record IDs and out-of-order histories are rejected. No allocation record is stored by the consumer. |
| Foreign, malformed, stale and missing evidence | Strict schema rejects foreign/extra fields and hash mismatches; reconciler rejects missing imported invoice, stale source revision, wrong invoice family, source-line mismatch and unreconciled cents. Missing allocation becomes an explicit billed-value exception. Unbound ERP exception is visible without fabricated binding. |
| Complete pagination and no partial success | Strict full-page count, order, scan hash and cursor tests pass. Changed scans restart from page one; incomplete/malformed responses fail without returning earlier pages. |
| Every eligible billed value represented | Fixture tests produce `reconciled`, `source-exception` or `missing-evidence` review for eligible imported repairs; absent finalization time is a separate explicit review. Pre-effective and non-repair records are excluded, not backfilled. |
| No drafts, journals, payments or balances | The simulation is read-only by design. The disposable replica-set test compared invoice/version/mapping/journal/audit counts and company lock before and after, with no changes. It also rejected missing `finance:read` and wrong-company access before a source request. |

TypeScript and scoped ESLint passed. Focused Phase 5, existing AR client and preview tests: **52 passed**. Development database safety and existing AR import/accounting regressions: **67 passed**. The isolated fixture verified exact loopback host, fixture database and replica-set identity before its setup writes; the running development database and ERP were not used as test fixtures. The strict producer schema is mirrored independently rather than imported across repositories; a future producer/consumer compatibility fixture should run whenever either contract changes.

## Remaining limits

This phase has **no durable Financial Agent allocation store**. It cannot promise replay continuity across process restarts; that later design must use authorized audited services and prove idempotency without touching invoice source history. The current 444 historical projections are pre-effective and intentionally receive no allocation. A future unbound ERP exception needs an approved identity-resolution procedure before it can be attached to a specific imported invoice. Genuine reissue, cancellation and correction authority remain business decisions. The source feed's UTC scan window and Indianapolis policy date are intentionally distinct; callers must use complete windows that include the relevant UTC first-finalization instants. No live 2027 allocation feed was requested, and no production configuration, authoritative AR, GL posting, balance, mapping or historical invoice was changed. **Phase 6 was not started.**

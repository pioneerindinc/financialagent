# Pioneer repair revenue allocation — Phase 6 management reporting

2026-10-13. Phase 6 adds an on-demand, read-only management report over Phase 5's complete ERP evidence scan and current imported Pioneer invoice projections. It does not persist allocation evidence or change invoice, AR, mapping, or accounting data.

## Implementation

- `src/domains/repair-allocation/report.ts` builds the report from a complete scan and retained invoice projections. It explicitly opts into `phase6-management-report` reconciliation: stale source revision, finalization/source-line binding mismatch, and billed repair-value mismatch become named source exceptions. These invoices contribute their actual billed repair lines once to Unallocated / Exceptions; contradictory evidence never supplies reporting categories. All other structural, identity, company, source-family, orphan, and scan-integrity failures remain rejected. Before classification it verifies `sourceAmountCents === linesCents === sum(invoice line amountCents)` for every selected invoice. Unknown line amounts or mismatches fail the report closed; no unexplained residual is assigned to “Other.” Other existing billed value is calculated only from actual source lines outside the applicable repair or direct-parts classification, including shipping lines.
- `src/domains/repair-allocation/reconcile.ts` defaults to `phase5-strict`. Phase 5 simulation calls that default and continues throwing on stale revisions, source-line/finalization binding mismatches, and unreconciled billed repair values. Only the Phase 6 report passes the explicit management-report mode; that mode relaxes only the three recognized attribution/reconciliation mismatches above.
- `src/domains/repair-allocation/management-report.ts` authorizes Pioneer `finance:read`, requests the full bounded ERP evidence window, and reads imported invoices in a snapshot transaction. Date inputs and eligibility use `America/Indiana/Indianapolis`; the UTC evidence query includes the next UTC date to cover local-day finalizations. The report filters only on `issuedAt` (first successful finalization); it never falls back to `invoiceDate`. If any imported invoice lacks `issuedAt`, period membership cannot be established, so the complete report is unavailable.
- `src/app/api/finance/route.ts` exposes the read-only `repair-allocation` view through the existing authenticated finance API. `/reports` provides a simple date-range screen and labels calculated components as reporting evidence, not earned or posted revenue.
- A failed, malformed, changed, or incomplete evidence scan or invoice read rejects the complete report; the UI presents an unavailable state and no partial totals.

## Accounting and reporting boundaries

The report date range is inclusive by Indianapolis-local finalization date, based only on `issuedAt`. The inclusive prospective eligibility boundary is the first successful invoice finalization at or after 2027-01-01 00:00 in `America/Indiana/Indianapolis`. Pre-effective repair billed value appears as outside-policy billed value and is excluded from the eligible coverage denominator. Eligible repair invoices in the reporting population are repair invoices with at least one `repair-revenue` item line and an effective-date finalization. Invoice-count coverage is **eligible repair invoices with valid reconciled allocation evidence / all eligible repair invoices included in the reporting population**. The UI displays numerator, denominator, and percentage. Missing-evidence and source-exception invoice counts and billed amounts remain separately visible in Unallocated / Exceptions. Unbound source exceptions are visible without fabricated invoice linkage.

Every selected invoice contributes its `sourceAmountCents` once. An independently checked source-line reconciliation proves that the billed total is fully supported by invoice lines before the bridge is built. For eligible repair invoices with a recognized attribution mismatch, the report shows source reason codes and billed repair value under Unallocated / Exceptions; it does not classify from that evidence. Phase 5 callers remain strict and reject those contradictions. For valid eligible repair evidence, gross parts/services plus signed contract adjustment minus concession deductions must equal billed repair net. Missing evidence does not create a classification. Shipping and other non-repair invoice value remain in “Other existing billed value” only when supported by actual source lines. The report is management-only: no GL posting, mapping change, authoritative AR change, customer balance, journal, payment, or allocation store is involved.

## Verification and acceptance gates

Verification completed:

- Focused Phase 5/6 reconciliation unit tests: **20 passed**. Coverage includes strict Phase 5 rejection versus explicit Phase 6 exception reporting for stale revisions, source-line/finalization binding mismatches, and billed-value mismatches; confirmed billed totals without allocation from contradictory evidence; and continued rejection of malformed, incomplete, foreign, orphaned, and unsupported-family evidence, alongside the existing Phase 6 report gates.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`: passed. The isolated disposable replica-set read-only test was not rerun for this correction; its last verification is recorded above and the database boundary was not changed.
- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `npm run build`: passed; `/reports` and `/api/finance` built successfully.

No persistent development database, production system, or ERP repository was accessed. The database test uses its disposable in-memory replica-set fixture.

## Known limitations

- The report is computed on demand and is not a saved point-in-time artifact. Later source or evidence revisions may change a rerun.
- Historical repair allocations are never reconstructed. A report range may include historical billed totals, but they remain outside allocation policy.
- An unbound ERP exception has no defensible invoice amount by itself. Any likely matching invoice remains in Unallocated / Exceptions through its own missing-evidence row; the unbound record is displayed separately.
- ERP allocation capture depends on its approved company configuration being enabled. This report does not activate producer configuration.
- Correction/reissue identity policy remains outside Phase 6; inconsistent evidence cannot be used to classify revenue.
- Unbound ERP exceptions cannot be assigned a billed amount without identity-resolution authority; they are shown by record ID while any eligible invoice lacking bound evidence remains in the billed exception bucket.
- A missing finalization timestamp on any imported invoice makes requested period completeness unprovable and blocks the whole report, even if `invoiceDate` appears to fall outside the selected range. This is intentional fail-closed behavior pending source data correction through the existing authorized source workflow.

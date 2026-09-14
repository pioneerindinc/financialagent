# FinancialAgent implementation report

Validated September 14, 2026. Scope: initial standalone accounting core. No live ERP, bank, QuickBooks, payment or payroll connection was created. No production data was seeded, imported or posted.

1. **Application architecture.** Next.js 16.3.5 App Router, React 19.2.8, strict TypeScript, Mongoose 9.10, Zod 4, JOSE verification, shared company-aware UI, thin HTTP adapter, transactional accounting services, separate reporting and bootstrap modules. MongoDB replica set is required. Financial writes use company serialization, snapshot read concern and majority write concern. Reports use snapshot transactions.

2. **Exact files created/changed.** See the complete inventory below. Existing `app/*` deletions and the move into untracked `src/` were present when this task began. Those pre-existing moves were preserved. `src/app/favicon.ico` was preserved. AGENTS.md and TypeScript strict settings were retained. No commit or deployment was performed.

3. **Routes.** `/`, `/companies`, `/accounts`, `/periods`, `/journal`, `/journal/[id]`, `/reports/trial-balance`, `/reports/general-ledger`, `GET /api/finance`, `POST /api/finance`. The financial pages share server-side session verification; the API verifies every request independently.

4. **Models.** Company, Account, Period, Journal with embedded lines, and Audit. All financial children carry companyId. No operational customer/vendor master, AR/AP, banking or payroll models were introduced.

5. **Company model.** Permanent predefined company IDs, display name, short name, active status, USD base currency, fiscal-year start, timestamps, creator/updater and internal transaction lock version. Explicit bootstrap upserts only missing company settings and creates indexes. IDs are preserved across renames and repeated bootstrap. January 1 is a default requiring business confirmation.

6. **Chart of Accounts.** Per-company code uniqueness, UUID, name, core account type, extensible subtype, active flag, optional same-company/same-type parent, timestamps and actors. UI supports creation/listing; no delete or bulk chart import exists.

7. **Accounting periods.** Inclusive validated calendar dates, open/closed state, closure time and actor. Overlap is rejected. Creation/closure serialize with posting. UI supports explicit create/close; no reopen or year-end automation exists.

8. **Journal/line model.** Draft and posted journal states, transaction/processing dates, description, source identity/fingerprint, reviewed revision, actor/timestamps, optional reversalOf. Embedded lines contain account, debit cents, credit cents and memo. Original reversal status is derived via linked reversal; the stored original remains posted and unchanged.

9. **Money representation.** Exact safe integer USD cents; fractional/unsafe input and arithmetic overflow are rejected. Line sides are nonnegative. BigInt quotient/remainder formats large values without decimal rounding. Signed report balances are allowed. Maximum absolute supported integer is 9,007,199,254,740,991 cents.

10. **Posting rules.** Human finance:write authorization, explicit company, matching reviewed revision, balanced 2–500 lines, exactly one positive side per line, active same-company accounts, and open period on transaction date. Posting retries return the posted record. No posted edit/delete service is exposed.

11. **Reversal rules.** Separate posted entry with equal/opposite lines, its own reason/actor/timestamps, original reference and unique per-company reversal index. Original is unchanged. Repeated reversals and reversals of reversals are rejected. A later open period may reverse an original in a closed period. Corrected entries require separate creation/review/posting.

12. **Source identity.** Unique companyId/sourceSystem/sourceType/sourceId/sourceRevision tuple. Same normalized payload returns existing result, including after posting. Conflicting payload fails deterministically. Reserved internal reversal namespace prevents spoofing. Manual edits retain original ingestion fingerprint and immutable source identity. New source revisions do not implicitly reverse previous postings.

13. **Audit metadata.** Human/service-prefixed actors, created/updated timestamps, postedAt/postedBy, closure metadata, descriptions/reasons, source references and reversal links. Audit rows share the write transaction; manual draft edits retain before/after snapshots. No audit edit/delete endpoint exists.

14. **Trial Balance.** Explicit company/as-of date, posted entries only, debit-positive net split into debit/credit balances and exact totals. Includes zero-balance accounts. Drafts are excluded; original and reversal net on their effective dates.

15. **General Ledger.** Explicit company, inclusive date range and optional validated account. Includes transaction date, entry link, description, account, debit, credit, source metadata and per-account running debit-positive balance. Pre-range activity contributes opening balance. Deterministic ordering and posted entries only.

16. **Human security.** Deny-by-default server boundary validates RS256 JWT signature, configured HTTPS JWKS, issuer, audience, required claims, expiration and one-hour maximum age. Company assignments and permissions come from verified claims. Human mutations require matching Origin. The real Pioneer login/session issuance bridge is not configured; this is the allowed secure authentication scaffold, not a complete login system.

17. **Service authentication.** Server-only hashed credentials, timing-safe comparison, expiry, assigned companies and narrow scopes. finance:source:write creates drafts only; finance:read reads scoped accounting data. ar:read/ap:read/cfo:read are reserved names without implemented domain endpoints. No all-access credential or default token exists.

18. **Company isolation.** Domain authorization precedes access. Queries, accounts, periods, journals, reversals and reports carry explicit company filters. UI requires selection and displays company next to write forms. Tests verify foreign account/parent/entry rejection, separate report results, forbidden company access and browser switching.

19. **Future AR.** Documented financial source projections, original/paid/remaining amounts, payments/applications, credits/write-offs, unapplied cash and aging. ERP retains source invoice and customer operational identity. No settlement implementation.

20. **Future AP.** Documented source bill projections, balances, payments/applications, credits, aging and separate scheduling states. ERP retains operational vendor/source evidence. No payment implementation.

21. **Future banking.** Documented bank/card accounts, import identity, matching/rules, transfers, cleared/reconciled states and reconciliation close. No provider or execution adapter.

22. **Obligations integration.** Planned company-scoped read projections for due/scheduled vendor payments, payroll/tax liabilities, loans, cards and recurring financial obligations, with status and freshness. Manual business obligations remain in Managers. Due, planned, approved, scheduled execution and actual paid dates remain distinct.

23. **CFO contract.** Documented cash, AR, AP, obligations, statements and comparisons with source/cutoff/freshness metadata. CFO Manager stays in Pioneer Managers. Selected-company reporting and consolidation require separate authorization, account mapping and elimination policies; they are not implemented.

24. **QuickBooks transition.** Documented cutoff, chart mapping, opening journals, open AR/AP, bank/card/loan/payroll balances, equity treatment, Trial Balance reconciliation, parallel validation, sign-off and rollback. FinancialAgent is not approved as the authority until reconciled.

25. **Tests added.** Integration tests use real disposable MongoDB replica sets to test accounting rules, persistence, uniqueness, isolation and concurrent races. Unit tests cover exact money and auth policy/credentials. Browser fixtures run the production app with temporary HTTPS/JWKS, actual signed sessions and an isolated database; no auth bypass is added to application code.

26. **Final test count.** 58 unit/integration tests passed across two Vitest files; 3 Playwright browser scenarios passed. Total: **61 passing tests/scenarios**.

27. **Validation results.** `npm run typecheck`: passed. `npm run lint`: passed with no lint warnings. `npm test`: 58 passed. `npm run build`: passed, all requested routes produced. `git diff --check`: passed (only Windows line-ending advisories). Package installation reported no known audit vulnerabilities at installation time.

28. **Browser results.** Passed unauthenticated denial on all financial pages and API; authenticated account/period creation, draft save, posting, Trial Balance, General Ledger, reversal to zero, company switching and mobile viewport; read-only write denial, forbidden company denial, invalid Origin denial and expired session denial. No browser page errors in the authenticated workflow. Browser-discovered select labeling issue was fixed before the final passing run.

29. **Architectural risks/limits.** Real identity issuance/revocation and deployment configuration remain work. Runtime MongoDB must support transactions and required indexes must be installed explicitly. Direct database administrators can bypass domain invariants; internal models are not a tamper-proof ledger barrier. Reports load full matching history and need a scale strategy before large migration. UI activity is limited to 100 recent entries, with full reports unaffected. A per-company write lock intentionally prioritizes correctness over high-throughput concurrency. No second-approver workflow exists. Production edge body/rate limits, backup/restore verification and accounting acceptance must be configured. Current fiscal defaults require confirmation.

30. **Exact recommended next step.** Complete the trusted Pioneer identity-provider bridge and staging acceptance with named company assignments and accountant/read-only roles on a provisioned replica set. Confirm fiscal settings and validate a reviewed journal cycle with the accountant. After that, separately scope a versioned ERP customer-invoice financial projection feeding reviewed drafts. Do not automatically proceed into AR/AP settlement, banking, payment execution, payroll or CFO Manager.

## Exact implementation file inventory

Modified existing files:

```text
.gitignore
README.md
package.json
package-lock.json
src/app/page.tsx
src/app/layout.tsx
src/app/globals.css
```

Created files:

```text
.env.example
playwright.config.ts
vitest.config.mts
scripts/bootstrap.ts
src/app/accounts/page.tsx
src/app/api/finance/route.ts
src/app/companies/page.tsx
src/app/journal/page.tsx
src/app/journal/[id]/page.tsx
src/app/periods/page.tsx
src/app/reports/trial-balance/page.tsx
src/app/reports/general-ledger/page.tsx
src/components/finance-console.tsx
src/components/finance-page.tsx
src/domains/accounting/queries.ts
src/domains/accounting/service.ts
src/domains/accounting/validation.ts
src/domains/companies/bootstrap.ts
src/domains/reporting/service.ts
src/lib/auth/policy.ts
src/lib/auth/session.ts
src/lib/config.ts
src/lib/db.ts
src/lib/errors.ts
src/lib/money.ts
src/models/index.ts
tests/accounting.test.ts
tests/money-auth.test.ts
tests/server-only.ts
tests/browser/finance.spec.ts
docs/architecture/README.md
docs/architecture/accounting-core.md
docs/architecture/data-ownership-matrix.md
docs/architecture/integrations.md
docs/architecture/ar-ap-roadmap.md
docs/architecture/banking-roadmap.md
docs/architecture/cfo-manager-contract.md
docs/architecture/security-and-approvals.md
docs/architecture/quickbooks-transition.md
docs/architecture/recommended-next-steps.md
docs/implementation-report.md
```

Generated `.next`, test artifacts and dependency files are ignored. Existing pre-task `app/*` deletions are not implementation deletions. No secrets are included in `.env.example`.

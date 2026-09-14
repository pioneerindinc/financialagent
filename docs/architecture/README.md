# FinancialAgent architecture

This repository is a fresh, standalone accounting application. No older finance architecture has been imported.

Implemented: Next.js App Router and React UI, strict TypeScript, Zod input validation, MongoDB/Mongoose persistence, company-scoped accounting services, exact integer cents, audited drafts/posting/reversals, periods, Trial Balance, General Ledger, and deny-by-default human/service authentication boundaries.

The application is not yet an approved replacement for QuickBooks. Deployment requires a MongoDB replica set, explicit index/bootstrap execution, and a trusted human identity-provider bridge. No live ERP, banking, payment, payroll, or migration connections exist.

## Organization

- `src/app`: authenticated page boundaries and thin finance API adapter.
- `src/components`: shared company-aware accounting console and forms.
- `src/domains/accounting`: validated transactional write services.
- `src/domains/companies`: explicit idempotent bootstrap.
- `src/domains/reporting`: posted-entry reports.
- `src/lib`: authentication policy/session verification, configuration, database, errors, money.
- `src/models`: persistence schemas and indexes. These are internal; external callers must use domain services.
- `tests`: isolated replica-set integration tests and unit/security tests.

## Documentation

- [Accounting core](accounting-core.md)
- [Local development](local-development.md)
- [Data ownership](data-ownership-matrix.md)
- [Integrations](integrations.md)
- [AR and AP roadmap](ar-ap-roadmap.md)
- [Banking roadmap](banking-roadmap.md)
- [CFO Manager contract](cfo-manager-contract.md)
- [Security and approvals](security-and-approvals.md)
- [QuickBooks transition](quickbooks-transition.md)
- [Recommended next steps](recommended-next-steps.md)

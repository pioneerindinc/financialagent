<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Financial Agent repository guidance

## Purpose and architecture

- This is a standalone, multi-company accounting application for Pioneer Industries, 317 Graphics & Apparel, Headquarters on Main, and Fish Properties.
- It uses Next.js App Router, strict TypeScript, Zod validation, Mongoose, and company-scoped accounting services.
- Accounting uses integer cents, balanced journals, audited changes, immutable posted history, reversals, and transaction-based company locking.
- ERP invoice and repair-allocation evidence is supplementary. It must never duplicate revenue or change accounting authority by implication.

## Read only what the task needs

- Start with the relevant domain implementation, its tests, and the specific docs named by the task.
- Avoid broad repository scans and unrelated files; use targeted `rg` paths and symbols.
- Before changing Next.js code, read the relevant guide under `node_modules/next/dist/docs/` and follow deprecation notices.
- Keep implementation changes small and within the authorized task or roadmap phase.
- Preserve existing modified and untracked files. Do not clean up unrelated work.

## Important locations

- `src/app`: pages and API routes; keep routes thin and enforce authentication/company checks at service boundaries.
- `src/domains/accounting`: validated transactional accounting services.
- `src/domains/ar`: Pioneer customer-invoice client, strict v1 contract, preview, imports, mappings, and AR lifecycle.
- `src/domains/repair-allocation`: strict supplementary feed client, contract mirror, and in-memory reconciliation simulation.
- `src/models`: internal MongoDB schemas; external or cross-domain changes must use authorized services.
- `src/lib`: authentication, company policy, configuration, database guards, money, and shared validation.
- `tests`: Vitest unit/integration tests; database tests use disposable MongoDB replica sets.
- `docs/architecture`: system design, data ownership, security, local development, and roadmap index.
- Pioneer AR and repair-allocation decisions and acceptance reports are in `docs/`.

## Database and environment safety

- Approved persistent development database: `financialagent_dev`, loopback `127.0.0.1:27291`, replica set `financialagent-dev`.
- The app enforces the exact development URI when local development authentication is enabled. Keep production and development identities isolated.
- Never print credentials, copy production secrets, bypass URI/topology guards, reset databases, or connect to production unless the task explicitly authorizes that action.
- Prefer disposable replica-set fixtures for database tests; assert fixture host, database, and replica-set identity before writes.
- `npm run dev:verify` creates local accounting validation records, including journal activity. Run it only when the task explicitly requires and authorizes those mutations.
- Do not run migrations, bootstrap/index setup, imports, resets, or other database writes unless required and explicitly authorized.

## Financial integrity and company isolation

- Derive company authority from the authenticated actor and server-side assignment. Validate the requested company and required scope on every service operation.
- Keep all accounting values in safe integer cents and use existing transaction, audit, idempotency, and posting services.
- Parallel AR projections are review-only. Authoritative AR is controlled by `PIONEER_AR_AUTHORITATIVE_ENABLED`; it must remain disabled unless explicitly approved.
- Do not create journals, drafts, payments, opening balances, or customer balances as a side effect of reading or reconciling source evidence.
- Never change mappings, accounting authority, or posting behavior without explicit approval.

## Pioneer integration contracts

- `pioneer-customer-invoices-v1` is strict. Preserve its fields, source identities, source revisions, pagination, and existing import/idempotency behavior.
- `pioneer-repair-revenue-allocation-v1` is a separate supplementary contract. Bind evidence to the exact invoice source ID, source revision, and source-line IDs; validate full pagination and correction lineage.
- Keep ERP origins and dedicated Bearer credentials server-side; use GET only for source scans and reject incomplete or changed scans before reconciliation.
- Allocation evidence describes existing billed repair revenue. It is not a new invoice or revenue source. Preserve parts, services, signed contract adjustments, concessions, and replacement-bottle identity.
- January 1, 2027 eligibility uses first finalization in `America/Indiana/Indianapolis`. Do not reconstruct or reclassify earlier history.
- Keep exceptions visible and incomplete. Never estimate missing amounts, silently drop eligible invoices, or turn allocation evidence into GL postings.
- Phase 5 currently provides read-only in-memory simulation; supplementary persistence and management reporting are later, separately authorized scope.
- Consult `docs/PIONEER_REPAIR_REVENUE_ALLOCATION_ASSESSMENT.md` and current phase reports before allocation work; each phase has separate authorization.

## Tests and acceptance

- During implementation, run focused tests for the changed domain and relevant existing regressions.
- At phase completion, run the required acceptance suite for that scope, plus TypeScript and scoped lint. Run broader checks only when the task or failures require them.
- Repository commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:browser`.
- Focused Vitest: `npx vitest run <relevant-test-files>`.
- Use `npm run dev:verify` only with explicit authorization because it mutates local accounting data.
- Do not weaken safety assertions or claim acceptance when a mandatory gate was not verified; state blocked gates and concrete results.

## Scope and reporting

- Complete only the phase or task explicitly authorized. Do not begin a later roadmap phase without separate approval.
- Do not deploy or commit unless separately requested.
- Keep completion reports concise: outcome, files changed, tests, acceptance status, and material limits.

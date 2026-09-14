# Local development implementation report

Command update: `npm run dev` now invokes the same guarded local testing launcher as `npm run dev:local`. References below to the original command naming are historical; production security gates are unchanged.

Validated September 14, 2026. The local application is available at **https://127.0.0.1:3445/dev/sign-in**. The managed development MongoDB and loopback-only app were left running. After validation, only task-created test records were reset through the confirmation-gated command and companies/indexes were bootstrapped again. Final local counts: **4 companies, 0 accounts, 0 periods, 0 journals, 0 audit rows**.

1. **Exact files changed.** Complete task-specific inventory follows below. Previous accounting implementation files and pre-existing `app/*` moves/deletions were preserved. No commit or deployment was made.
2. **Local Mongo strategy.** Reuse the existing development dependency to launch a versioned real native MongoDB binary with persistent WiredTiger storage. No Docker requirement and no changes to installed MongoDB services. An installed MongoDB outside PATH and existing application ports were discovered; these were left untouched.
3. **Replica-set configuration.** MongoDB 8.0.12, one member, set `financialagent-dev`, bind `127.0.0.1`, port `27291`, data `.local/mongodb`. Authenticated lifecycle controller on `127.0.0.1:27292`. Startup refuses occupied ports and waits for primary; status verifies expected set and primary.
4. **Database name.** `financialagent_dev`, using one exact loopback URI. It is separate from production, ERP and automated test databases.
5. **DB commands.** `npm run dev:db:start`, `npm run dev:db:status`, `npm run dev:db:stop`, `npm run dev:db:reset`. Start is foreground; stop retains data. Reset prints the target and requires exact `RESET financialagent_dev` confirmation. There is no arbitrary URI/database parameter or force flag.
6. **Dev-auth architecture.** Separate HS256-signed, expiring development session; existing RS256/JWKS Pioneer verifier is unchanged. A shared request adapter selects the appropriate verified human principal and always gives a provided Pioneer cookie precedence, without fallback on verification failure. Domain services and company/scope policy remain authoritative.
7. **Server safety gates.** NODE_ENV exactly development; explicit DEV_AUTH_ENABLED=true; valid server-only private secret; exact HTTPS loopback origin and Host; pinned development database URI; internal marker supplied by the loopback-binding launcher; rejection of remote/ambiguous forwarded peers; exact Origin for mutations. Missing/unsafe configuration fails closed. Production ignores dev cookies and returns 404 on dev issuance routes.
8. **Operator.** Local Finance Developer, ID `dev:local-finance`, four permanent company assignments, finance:read and finance:write only. Audit records use `human:dev:local-finance`. No production user is created.
9. **Sign-in flow.** GET `/dev/sign-in` shows DEVELOPMENT ONLY / Local FinancialAgent Session / Not Pioneer Production Authentication. Its button posts to `/dev/session`, sets a signed cookie, and redirects to `/companies`. A persistent Development Session banner includes logout. Unavailable sign-in returns 404.
10. **Cookie/session behavior.** Separate `__Host-finance-development` cookie, Secure, HttpOnly, SameSite=Strict, Path=/, no Domain, one-hour lifetime. HS256 issuer/audience/subject/marker are verified; company/scopes are fixed server-side. Logout clears only the development cookie. HTTPS remains enabled; no global security relaxation exists. A generated self-signed certificate needs a site-specific browser exception or an administrator-approved replacement pair.
11. **Bootstrap.** `npm run dev:bootstrap` validates the owned local controller, exact URI and primary, then calls the existing idempotent company/index bootstrap with the development actor. No accounting records are seeded. The existing general `npm run bootstrap` remains unchanged.
12. **Seed/reset behavior.** No automatic or demo seed. Explicit `npm run dev:verify` creates labelled DEV VALIDATION records for UI testing only. Reset cancellation and exact-confirmation success were both exercised after verifying the database contained only task-created records. Final reset was followed by company/index bootstrap, leaving clean local books.
13. **Startup.** Terminal 1: `npm ci`, `npm run dev:setup`, `npm run dev:db:start`; wait for primary and keep open. Terminal 2: `npm run dev:bootstrap`, `npm run dev:local`. Visit https://127.0.0.1:3445/dev/sign-in, accept only this site's local certificate, sign in, and select a company. On subsequent starts, retained configuration/data can be reused. Use Ctrl+C in the app terminal to stop it; use dev:db:stop to stop the database. Full details are in [local development](architecture/local-development.md).
14. **Production confirmation.** Production build succeeds with the local environment file present, while production browser tests receive 404 from `/dev/sign-in` and POST `/dev/session`. Original Pioneer signed-session, read-only, company, Origin and expiration checks remain meaningful and pass. There is no default production identity, automatic bootstrap, local database assumption or production secret requirement added.
15. **Security tests.** Added disabled-default, production/test-runtime rejection, missing/weak config, launcher requirement, unsafe URI rejection, remote Host/Origin/forwarded-peer rejection, real signed-session verification, tamper/expiry rejection, normal authorization, Pioneer precedence/no fallback, mutation origin preservation, route denial and cookie-attribute tests. Checked the actual generated dev secret was absent from production and local browser assets without printing it.
16. **Mongo/dev tests.** Added real replica initialization/transaction commit, standalone rejection, incorrect set/no-primary rejection and concurrent initial-connection regression tests. Actual launcher start/status/stop/restart, explicit bootstrap and confirmed reset were exercised against local-only data. The application now reports a clear replica-set requirement for standalone MongoDB.
17. **Final counts.** **91 unit/integration tests**, preserving the original 58; **3 production browser scenarios**; **2 local browser scenarios**. Total: **96 passing tests/scenarios**. The persistence scenario was additionally run after actual app and database restarts.
18. **Typecheck/lint/build.** All passed. Strict TypeScript retained. `git diff --check` passed with only Windows line-ending advisories. Local generated output is isolated in `.next-local` and ignored by Git/lint; Next added its generated type paths to tsconfig.
19. **Browser results.** Production authentication suite passed unchanged assertions plus dev-route denial. Local signed sign-in, Secure/HttpOnly cookie, company selection, full journal lifecycle, reports, development audit actor, logout and persisted record lookup all passed.
20. **Manual/local accounting validation.** Used the actual running development UI to create labelled accounts, an open period, a $123.45 balanced draft, reviewed posting, Trial Balance/General Ledger and equal/opposite reversal. Verified audit attribution through the dedicated local database. Restarted both app and MongoDB; original/reversal records remained available. A cold-start connection race was discovered, fixed using a shared in-flight connection promise, and regression-tested. Validation records were then reset explicitly so the delivered local database is clean.
21. **Remaining setup limits.** First install may need network access for dependency/MongoDB/Chromium downloads. Browser policy may require an approved local TLS certificate instead of a self-signed exception. Database/app terminals must remain running. Ports are deliberately fixed and occupied ports cause failure. Local MongoDB assumes a trusted single-user machine and has no Mongo account authentication; never tunnel/expose these loopback ports. Real Pioneer identity integration remains a separate production prerequisite.
22. **Next recommended step.** Open the local URL, sign in, and manually test the accounting workflows with your chosen account codes and periods. Resolve any accounting UX/policy findings before staging production identity integration. ERP integration, AR/AP, banks, payments, payroll and CFO Manager remain out of scope.

## Task-specific file inventory

Modified existing files:

```text
.env.example
.gitignore
README.md
eslint.config.mjs
next.config.ts
package.json
package-lock.json
tsconfig.json
src/app/api/finance/route.ts
src/app/globals.css
src/components/finance-page.tsx
src/lib/auth/policy.ts
src/lib/config.ts
src/lib/db.ts
tests/browser/finance.spec.ts
docs/architecture/README.md
docs/architecture/security-and-approvals.md
```

Created files:

```text
playwright.local.config.ts
scripts/local/common.ts
scripts/local/setup.ts
scripts/local/database.ts
scripts/local/bootstrap.ts
scripts/local/start.ts
src/app/dev/sign-in/page.tsx
src/app/dev/session/route.ts
src/lib/development/config.ts
src/lib/auth/development.ts
src/lib/auth/request.ts
src/lib/db-topology.ts
tests/development.test.ts
tests/development-mongo.test.ts
tests/local-browser/development.spec.ts
docs/architecture/local-development.md
docs/local-development-report.md
```

Generated local-only assets (ignored, never committed): `.env.local`, `.local/https-key.pem`, `.local/https-cert.pem`, `.local/db-control.json`, `.local/mongodb`, local validation reference, `.next-local`, and test output. No secret values are included in this report or `.env.example`.

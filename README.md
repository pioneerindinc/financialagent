# FinancialAgent

A standalone, multi-company accounting foundation for Pioneer Industries, 317 Graphics & Apparel, Headquarters on Main, and Fish Properties.

Implemented: Chart of Accounts, periods, balanced drafts, reviewed posting, immutable posted history through the service boundary, reversals, source idempotency, audit records, Trial Balance and General Ledger. No AR/AP settlement, banking, payments, payroll or live ERP integration is enabled.

## Local development

Use Node.js 22.12 or newer. From this repository, in terminal 1:

```powershell
npm ci
npm run dev:setup
npm run dev:db:start
```

Wait for `Primary ready`. Keep that terminal open. In terminal 2:

```powershell
npm run dev:bootstrap
npm run dev
```

Open **https://127.0.0.1:3445/dev/sign-in**, accept the certificate exception for this exact local site, and click **Sign in as Local Finance Developer**. The **Development Session** banner identifies local sessions. Select a company and use the accounting UI.

Setup generates ignored local credentials and HTTPS certificates without printing secrets or overwriting an existing `.env.local`. The dedicated persistent `financialagent_dev` database uses a real MongoDB replica set on loopback port 27291, separate from production, tests, and existing MongoDB services. No Docker or production identity provider is required. No financial records are seeded by setup/bootstrap/startup.

Use `npm run dev:db:status` and `npm run dev:db:stop` for the managed database. `npm run dev:db:reset` requires typing `RESET financialagent_dev`; then run `npm run dev:bootstrap` again. The optional, explicit `npm run dev:verify` runs a labelled local browser accounting cycle and leaves its local validation records for inspection.

See [local development](docs/architecture/local-development.md) for certificate handling, exact configuration, manual testing, isolation guarantees and troubleshooting. `npm run dev` starts the guarded local testing workflow; `npm run dev:local` remains an equivalent alias.

## Production prerequisites

Use Node.js 22.12 or newer and a MongoDB replica set (or Atlas); standalone MongoDB cannot support the required transactions.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure the database and authentication settings. The example contains names only.
3. Set `BOOTSTRAP_ACTOR` to the responsible operator and run `npm run bootstrap` explicitly. It creates required indexes and inserts only missing companies with permanent IDs. It does not create financial data or reset company settings.
4. Configure the trusted identity-provider session bridge described in [security and approvals](docs/architecture/security-and-approvals.md). Without it, production financial pages remain behind the sign-in boundary. No production default account, password or bypass exists.
5. Run `npm run build` followed by `npm start`. Use HTTPS for actual session cookies. Do not deploy development environment files or `.local` assets. Development sign-in returns 404 in production even with dev flags set.

Runtime validates environment settings when their capability is requested. Builds do not require secrets or access a database. `.env.local` is ignored. Service tokens remain in server-side secret configuration; never use NEXT_PUBLIC variables for them.

## Validation

```text
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The main unit/integration and production-auth browser suites allocate disposable MongoDB 8.0 replica sets and never use `.env.local` database credentials. The first run may download MongoDB/Chromium. Production browser tests run the build on reserved local ports 3105/3444 with a temporary HTTPS/JWKS provider and in-memory signing keys. They use verified fixture sessions, not an application authentication bypass, and shut down their fixtures after completion. Do not run another server on those ports during browser checks. The separate, explicit `dev:verify` command uses the managed local development database as documented above.

## Routes

`/`, `/companies`, `/accounts`, `/periods`, `/journal`, `/journal/[id]`, `/reports/trial-balance`, `/reports/general-ledger`, and `GET/POST /api/finance`.

Financial pages use explicit `?company=<permanent-company-id>` context. Each mutation carries companyId and the server checks both assigned company and required scope. Company identity is shown beside financial forms. Accounts and periods can be created; manual drafts can be created/edited, reviewed, posted and reversed. Reports use transaction dates and posted records only.

Read [the architecture index](docs/architecture/README.md) for implemented behavior, future boundaries, migration planning and deployment requirements. Next recommended work is staging authentication/operational acceptance, followed by a narrowly scoped source-invoice financial projection under a separate assignment.

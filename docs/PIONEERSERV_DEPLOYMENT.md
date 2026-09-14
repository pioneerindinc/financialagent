# FinanceAgent deployment on PIONEERSERV

## Human authentication bridge validation (September 14, 2026)

- Reviewed against local baseline `04afc08`; the bridge and documentation remain uncommitted. The existing `src/app/globals.css` edit was preserved.
- Root `npm ci` was blocked by a Windows lock on `lightningcss.win32-x64-msvc.node`. A clean `npm ci` succeeded in `.local/auth-audit-04afc08`, an ignored copy of the same changed source without environment files. No running application/service was stopped. Missing checkout dependencies were restored without replacing existing/locked files.
- In that clean copy, `npm run typecheck`, `npm run lint`, `npm test` (**118 passed**), and `npm run build` passed. The nested build emitted only the workspace-root/multiple-lockfile warning. `git diff --check` passed in the original working tree.
- `npm run test:browser` passed **4 HTTPS production-browser tests**: the three existing external-JWT/accounting scenarios and the new internal login/session/logout scenario. The internal scenario checks unauthenticated gating, cross-origin denial, dev-route rejection under production, secure HttpOnly cookie behavior, session revocation and no secret/hash in browser HTML/JavaScript. Sixteen new integration tests exercise internal authentication and failure paths.
- Tests created only disposable fixture databases and temporary test identities. No PIONEERSERV connection, real user, persistent database bootstrap, production data access, deployment, commit or push occurred. The actual centralized environment, Pioneer MFA policy and server proxy/service behavior remain operator acceptance requirements.

## Earlier deployment validation (September 14, 2026)

- `npm ci` initially failed in the root checkout because a running Windows process held `lightningcss.win32-x64-msvc.node`. No process/service was stopped. A clean install succeeded in an ignored isolated copy of the working tree under `.local/deployment-audit-85e6acb`, with no workstation environment files copied. Missing root dependency files were subsequently restored from that successful install without replacing existing/locked files; `npm ls --depth=0` passed.
- Against the same application source in that isolated copy: `npm run typecheck`, `npm run lint`, `npm test` (**102 tests**) and `npm run build` passed. Eleven new tests cover health payloads, no-DB liveness, read-only probe commands, failure sanitization, insufficient topology, cleanup and environment normalization.
- A local production-mode smoke process with no database URI confirmed `/api/health` 200, `/api/health/db` sanitized 503, `/dev/sign-in` and POST `/dev/session` 404 with dev flags enabled, and unauthenticated finance API 401. That temporary process was stopped after validation. No database connection was configured for this smoke test.
- The isolated nested build emitted a workspace-root warning due to the parent checkout's lockfile; compilation and route generation completed successfully. PIONEERSERV's real service/runtime layout remains untested.
- No persistent MongoDB was contacted, bootstrapped or changed. Existing automated tests used only their own disposable fixture databases. No commit, push, deployment or PIONEERSERV action occurred. A separate in-progress `src/app/globals.css` edit was preserved and is not a deployment-audit change.

**Critical application: FinanceAgent holds accounting records. Mark it critical in Pioneer Platform, require reviewed releases and explicit change approval, and never treat an application rollback as permission to restore or delete financial data.**

This is a preparation/runbook, not deployment authorization. The operator reports the app is deployed at `https://finance.pioneercryo.com`, managed by Pioneer Platform, with dedicated MongoDB `mongodb://127.0.0.1:27018/finance_agent?replicaSet=finance-rs`. These settings were not contacted or independently verified. Service account/name, port, centralized environment path and release roots must be supplied/approved by the platform owner. Commands are for a future approved deployment only.

## Source and release contract

- Repository: `https://github.com/pioneerindinc/financialagent.git`.
- Branch: `main`; original deployment audit baseline: `85e6acb`; human-auth bridge baseline: `04afc08`.
- Working changes remain local/uncommitted pending review. Do not deploy this unreviewed working tree.
- Following review, select an approved commit and record its full SHA in Pioneer Platform. Use a new timestamped release directory, not an in-place update of the running release.
- Suggested layout, not verified server paths: `<APP_ROOT>\releases\<UTC_TIMESTAMP>-<SHORT_SHA>`, a separate centralized `<ENV_FILE>`, and persistent `<LOG_ROOT>`. Retain the previous release and its build artifacts.
- Exclude workstation `.env.local`, `.local`, `.next-local`, `node_modules`, test outputs and signing fixtures from source packaging. Build `.next` and install dependencies for the approved release. Do not copy local MongoDB files or development secrets.
- Tested local toolchain: Node.js 24.13.0 / npm 11.17.0. Use an approved compatible Node runtime on PIONEERSERV (repository tooling requires Node 22.12+). Install native dependencies on the target OS/architecture or a matching Windows build worker; do not copy Linux `node_modules`.

## Install, validate, build and start

In a new release directory, with full development dependencies available for build/test tooling:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Tests create disposable replica sets and temporary fixture databases, never use the target finance database. Run them on an approved build/validation worker; do not point them at PIONEERSERV finance data. The first test run may download a MongoDB binary. Build and type generation do not require database access or identity-provider credentials; validation is lazy and financial routes are dynamic.

`npm run build` invokes `next build`. **`npm start` invokes `next start`**, which runs the production `.next` build. `npm run dev` and `npm run dev:local` invoke `scripts/local/start.ts` and must never be used by NSSM or production deployment management.

With approved runtime variables injected into the service environment, the equivalent npm production command is:

```powershell
npm start -- --hostname 127.0.0.1 --port <APPROVED_PORT>
```

For NSSM, prefer launching the absolute Node executable directly so NSSM supervises the runtime rather than an npm shell. Supply a centralized environment file using Node's `--env-file` option, before the Next CLI path:

```text
<NODE_EXE> --env-file="<ENV_FILE>" "<RELEASE>\node_modules\next\dist\bin\next" start --hostname 127.0.0.1 --port <APPROVED_PORT>
```

The centralized file is not loaded automatically by `npm start`; either use the direct Node command above or have Pioneer Platform securely inject its values. `--env-file` must point to an existing file. Inherited process variables take precedence, so eliminate conflicting service/machine-level settings. Do not copy centralized secrets into releases just to satisfy Next's automatic `.env` discovery.

Always set `NODE_ENV=production`. The service working directory must be the chosen release. Do not use `--experimental-https`, local certificates or `.next-local`. Terminate trusted HTTPS at the approved reverse proxy and bind Next to loopback. Preserve the canonical external Host/Origin for requests. The port must be approved and collision-free; no server port has been selected by this audit.

## Complete environment contract

`.env.example` documents the production contract with safe non-secret defaults; blank required values are not runnable. Store populated values in the centralized ACL-protected file, outside releases and source control. See [PRODUCTION_AUTH.md](PRODUCTION_AUTH.md) for the mode-specific contract and explicit auth-user procedure.

| Variable                             | Requirement and actual behavior                                                                                                                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                           | Required deployment setting: `production`. Dev issuance also checks this in server code and cannot activate in production.                                                                                                                                                                              |
| `MONGODB_URI`                        | Required for DB readiness and all finance operations. Validated mongodb/mongodb+srv URI with an explicit, dedicated database. Use an approved replica set/cluster and appropriate authentication/TLS. Never use ERP, existing production accounting, development or test databases for initial staging. |
| `APP_BASE_URL` | Required canonical HTTPS origin: `https://finance.pioneercryo.com`. Mutation Origin must match exactly. No path/query/userinfo. |
| `AUTH_MODE` | Use explicit `internal` for the self-contained bridge; `external` (also unset default) preserves existing issuer verification. Invalid modes fail closed. |
| `AUTH_SESSION_SECRET` | Internal mode only: dedicated 32 random bytes as 64 lowercase hex characters, runtime-only, never DEV_AUTH_SECRET. Rotation invalidates internal sessions. |
| `AUTH_ISSUER` | External mode only: exact trusted JWT issuer URL. Unused in internal mode. |
| `AUTH_AUDIENCE` | External mode only: exact agreed application audience. Unused in internal mode. |
| `AUTH_JWKS_URL` | External mode only: reachable HTTPS RS256 public-key endpoint with valid TLS. Unused in internal mode. |
| `SERVICE_CREDENTIALS_JSON`           | Optional; absent/blank defaults to an empty array, denying all service access. Configured JSON array records contain `id`, `sha256` (64 lowercase hex), `companies` (nonempty list of exact IDs), `scopes`, and `expiresAt` (ISO datetime). Store only token hashes, never plaintext tokens.            |
| `BOOTSTRAP_ACTOR`                    | Operator-only; required only during explicitly approved bootstrap. Nonblank responsible operator ID, recorded with `human:` prefix. Not required for build/service start.                                                                                                                               |
| `PORT`                               | Optional Next CLI setting if injected before CLI execution. Prefer explicit NSSM `--port`; do not rely on Next's internally loaded `.env` for port selection.                                                                                                                                           |
| `NEXT_TELEMETRY_DISABLED`            | Optional framework setting; `1` disables telemetry when required by platform policy.                                                                                                                                                                                                                    |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Optional build-time shared Server Actions encryption key. Not required for this initial single-instance application; see audit below.                                                                                                                                                                   |
| `DEV_AUTH_ENABLED`                   | Dev-only; omit or set `false` on PIONEERSERV. A value of `true` cannot override `NODE_ENV=production`.                                                                                                                                                                                                  |
| `DEV_AUTH_SECRET`                    | Dev-only HS256 secret; omit from PIONEERSERV. Does not validate Pioneer RS256 sessions.                                                                                                                                                                                                                 |
| `DEV_AUTH_LOCAL_LAUNCH`              | Internal dev-only launcher marker; omit from PIONEERSERV.                                                                                                                                                                                                                                               |
| `FINANCE_LOCAL_DEV_BUILD`            | Internal dev-only build-directory switch; omit from PIONEERSERV. `next.config.ts` requires development mode as well before selecting `.next-local`.                                                                                                                                                     |

No `AUTH_SECRET` is consumed by this app. No NEXT_PUBLIC credential, client-visible service secret, production password or bootstrap-on-start variable exists. Browser-test `NODE_EXTRA_CA_CERTS` is temporary fixture plumbing, not an application production requirement. If corporate CA trust is needed for JWKS/MongoDB, provision approved trust through the platform; never globally disable certificate validation.

### First internal staging/testing requirements

There are three distinct acceptance levels:

1. **Process smoke only:** approved Node runtime, built release, explicit production environment and service port. `/api/health` requires neither auth nor a database. Its success is not accounting readiness.
2. **Database readiness:** additionally provide a dedicated fresh staging replica-set database and MONGODB_URI. `/api/health/db` performs read-only checks; no bootstrap or collection data access occurs.
3. **Interactive accounting staging:** configure `APP_BASE_URL`, explicit `AUTH_MODE=internal`, independent `AUTH_SESSION_SECRET`, and manually create the first assigned user/auth indexes using [PRODUCTION_AUTH.md](PRODUCTION_AUTH.md). External mode instead requires issuer/audience/JWKS plus a real issuer bridge. Accounting bootstrap remains separate and requires approval; do not rerun it on an existing deployed database as an auth step. Service tokens cannot provide browser sessions or post/reverse journals.

## Authentication audit

The repo originally only verified external RS256 JWTs and provided no issuer. `AUTH_MODE=external` preserves that verifier: exact issuer/audience, mandatory sub/iat/exp, maximum age one hour, company IDs and recognized finance scopes. Internal mode now provides GET `/sign-in`, POST/GET `/auth/session`, and POST `/auth/sign-out`. It verifies scrypt password hashes, signs one-hour HS256 cookies and checks revocable MongoDB sessions plus current user assignments on every request. Cookie attributes are Secure, HttpOnly, SameSite=Strict, Path=/, no Domain, with the `__Host-finance-session` name. There is no algorithm fallback between modes.

Human financial writes still require finance:write, human principal type and company membership with exact mutation Origin verification. Internal viewers receive only finance:read; admin/accountant roles receive read/write only for explicitly assigned companies. Login and logout also enforce exact Origin. Logout deletes the session; password reset/disable changes the user version to invalidate all prior sessions. Persistent attempt limits and bounded hashing concurrency protect password verification. External mode retains expiry-based revocation. Apply the platform's MFA/access-review policy: the internal bridge is password-only, so mandatory MFA would require an approved integration before release.

Services accept only configured hashed tokens with expiration and assigned companies. Implemented scopes: finance:read and finance:source:write (draft creation only). ar:read, ap:read and cfo:read are recognized reserved scope names without implemented endpoints. Services cannot post/reverse journals, create accounts or close periods. No broad finance:write service token is accepted.

`src/lib/auth/request.ts` ignores development cookies unless NODE_ENV is exactly development and explicit opt-in is true. `src/lib/development/config.ts` independently requires development mode, exact local URI/origin, private secret and launcher marker. `/dev/sign-in` and POST `/dev/session` fail closed in production. A provided Pioneer cookie takes precedence and verification failures never fall back to development identity. Existing fail-closed tests exercise production with dev settings present. None of these checks were weakened for deployment.

## MongoDB topology and transaction inventory

**Normal accounting requires transaction-capable MongoDB. A standalone mongod is insufficient, including for the initial reports.** Provision a dedicated approved replica set with primary election, logical sessions, appropriate feature compatibility and permissions. A single-member replica set can support isolated staging but is not high availability. Production resilience, backup/restore and member layout require platform/DBA approval. A properly configured sharded cluster is supported by the current topology guard as well; do not introduce sharding merely for this application.

The reported PIONEERSERV database is `finance_agent` on dedicated replica set `finance-rs`, loopback port 27018. Confirm member addresses, replicaSet option, TLS/authSource, firewall reachability, primary selection and dedicated least-privilege runtime credentials through the approved platform process. Health probing does not grant privileges or create this database. The explicit auth-user CLI creates only auth records/indexes in `auth_users`, `auth_sessions` and `auth_attempts`; it never runs accounting bootstrap.

| Location                                             | Actual transaction/session use                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domains/accounting/service.ts` shared `write()` | Mongoose connection transaction with snapshot read concern, majority write concern and primary read preference. Locks the company document to serialize financial writes. Used by account creation, period creation/closure, draft creation/edit, journal posting and reversal. |
| Accounting service helpers/queries                   | Account/period/source/journal lookups use the same session. Creates, saves, updates and Audit inserts pass the same session, keeping audit and financial mutations atomic.                                                                                                      |
| `src/domains/reporting/service.ts` Trial Balance     | Snapshot transaction for posted journal and account reads.                                                                                                                                                                                                                      |
| Reporting General Ledger                             | Snapshot transaction for posted ledger reads, including pre-range running balances.                                                                                                                                                                                             |
| `scripts/bootstrap.ts` / company bootstrap           | Explicit index creation and insert-only company upserts; not one all-or-nothing transaction. Still calls the guarded connection helper.                                                                                                                                         |
| Tests                                                | startSession/withTransaction and disposable replica sets in test fixtures only; no production session setup or database access is performed by this audit.                                                                                                                      |
| Health DB probe                                      | Separate short-lived driver connection; ping and hello only. No sessions, transactions, model initialization, indexes, collection reads or writes.                                                                                                                              |

`src/lib/db.ts` checks hello after connecting and calls `assertTransactionTopology` from `src/lib/db-topology.ts`. That guard rejects a server lacking both a replica-set `setName` and mongos `msg=isdbgrid`, returning a 503 DomainError. It identifies supported topology, not operational guarantees: it does not prove write authorization, unique indexes, majority durability, all shard health or a successful transaction. Actual transactions can still fail, so staging acceptance must test authorized writes separately. No topology or local Mongo configuration was changed.

## Health endpoints

| Endpoint             | Contract                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/api/health`    | Unauthenticated, no database/config dependency, HTTP 200 with exactly `{ "ok": true }`. Dynamic/no-store process liveness.                                                                                                                                      |
| GET `/api/health/db` | Unauthenticated read-only readiness; HTTP 200 when ping and topology checks pass, otherwise HTTP 503. Only `ok`, normalized `environment` and `transactionReady` booleans/label are returned. No database name is returned, deliberately minimizing disclosure. |

DB readiness checks ping and hello. It requires a replica primary (or mongos), logical-session support and sufficient wire version for transactions. `transactionReady` is **topology readiness**, not proof of accounting write permissions, required indexes or healthy identity configuration. On configuration, connection, ping or topology failure it returns a generic not-ready payload; exceptions, credentials, connection strings, hostnames, paths, replica-set names and database names are never serialized/logged by the probe.

The probe uses bounded connection/selection/socket waits and a separate one-connection pool, closed after the request. Configure a sensible probe timeout (for example 10 seconds) and moderate polling interval; restrict/rate-limit health access at the internal reverse proxy if needed. Monitor both endpoints in Pioneer Platform. A database outage should mark readiness degraded and alert an operator; do not endlessly restart a healthy process because MongoDB is unavailable. Neither endpoint mutates accounting data.

## Bootstrap audit and approved procedure

`scripts/bootstrap.ts` requires BOOTSTRAP_ACTOR, calls the company bootstrap, and disconnects. `ensureIndexes()` creates declared indexes for Company, Account, Period, Journal and Audit. Important unique indexes cover company/account code; company/period start/end; company/source-system/type/ID/revision; and company/reversalOf (partial index). Index creation can create otherwise empty collections, but no account/period/journal/audit documents are seeded.

Company upserts create only missing companies:

| Permanent ID           | Name                   |
| ---------------------- | ---------------------- |
| `pioneer-industries`   | Pioneer Industries     |
| `317-graphics`         | 317 Graphics & Apparel |
| `headquarters-on-main` | Headquarters on Main   |
| `fish-properties`      | Fish Properties        |

New companies have active status, USD base currency, January 1 fiscal-year default, short name and attributed timestamps. Existing business fields are protected by `$setOnInsert`; Mongoose may refresh updatedAt on repeated upserts. Bootstrap is operationally idempotent for records/indexes, not a byte-for-byte no-op or one atomic batch. A partially completed run can be rerun after addressing its error. It creates **no accounts, accounting periods, journal entries/lines, opening balances, demo transactions or payments**.

The baseline bootstrap used `Pioneer`; during this audit the user explicitly authorized restoring `pioneer-industries` to match identity assignments and tests. This is a source-code correction only, not a migration. **If any existing target database contains a `Pioneer` company or financial references to it, stop: rerunning this bootstrap would create another company, not rename/relink existing books.** Any migration needs a separately reviewed reconciliation plan. Fresh staging requires explicit confirmation that the database is empty/dedicated and that fiscal defaults and company IDs are approved.

Once separately authorized, run bootstrap once under a responsible operator with necessary index-creation and company-upsert privileges. It is suitable for a fresh dedicated replica-set database after those checks. Do not put it in NSSM startup, health checks, build, or automatic deployment hooks.

The convenience `npm run bootstrap` hardcodes `--env-file=.env.local`; do **not** create/copy a workstation `.env.local` in production to satisfy it. Use the existing script with the approved centralized file instead, while tsx dev tooling is installed in the approved release/build environment:

```powershell
$env:BOOTSTRAP_ACTOR = '<APPROVED_OPERATOR_ID>'
& '<NODE_EXE>' '--env-file=<ENV_FILE>' '.\node_modules\tsx\dist\cli.mjs' '.\scripts\bootstrap.ts'
```

Replace placeholders, run from the intended release, and independently verify the exact target database before approval. This command has not been executed against any target/local persistent database as part of deployment preparation. Keep runtime credentials distinct from operator/index-management privileges where practical. First accounting periods and accounts are explicit user actions after login, not bootstrap side effects.

## Expected NSSM / Pioneer Platform registration

No actual service has been created or configured. Record these reviewed values in Pioneer Platform:

| NSSM/platform field  | Expected value                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App/service identity | FinanceAgent (`financialagent` repo); final service name approved by platform owner                                                                           |
| Criticality          | **Critical — accounting data**                                                                                                                                |
| Application          | Absolute approved `node.exe`                                                                                                                                  |
| AppDirectory         | Absolute selected timestamped release directory                                                                                                               |
| AppParameters        | `--env-file="<ENV_FILE>" "<RELEASE>\node_modules\next\dist\bin\next" start --hostname 127.0.0.1 --port <APPROVED_PORT>`                                       |
| Environment          | NODE_ENV=production, centralized approved contract above, no conflicting inherited variables/dev assets                                                       |
| Service account      | Approved least-privilege identity, read access to release/env, necessary runtime cache/log write access; no administrator/default broad credential assumption |
| stdout/stderr        | Separate persistent log files under approved centralized log root; rotation/retention enabled, credentials excluded                                           |
| Restart policy       | Controlled restart on process failure with delay/backoff; alert on persistent failures                                                                        |
| Stop behavior        | Graceful console shutdown with an approved drain/timeout before forced termination; validate under staged NSSM service                                        |
| Health               | Process and DB readiness URLs, external HTTPS route and alert ownership                                                                                       |
| Deployment metadata  | Repo, branch, approved full commit SHA, timestamped release path, previous release, env revision and approval record                                          |

The platform deployment manager should update working directory/arguments to the approved release (or its existing atomic release-pointer convention), restart only this service, and validate health plus authorized user access. Exact PIONEERSERV conventions are not present in this repo and have not been verified; do not invent platform registration keys or run an unreviewed NSSM script.

## Next.js encryption/runtime secret audit

No `use server` Server Action/Server Function declarations are present. Mutations use Route Handlers. External human verification uses public JWKS; internal mode requires a separate runtime `AUTH_SESSION_SECRET` to sign sessions. This application secret is independent of Next.js Server Action encryption.

The installed Next.js 16.3.5 self-hosting guide states that Next generates a Server Function encryption key per build. For a single service running one immutable build, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` may remain framework-managed. It is **not** a first-deployment blocker and is not a substitute for AUTH_ISSUER/AUDIENCE/JWKS.

If future deployment uses independently built replicas, overlapping releases with Server Actions, or requires shared action encryption, configure a protected base64 AES key (16, 24 or 32 bytes) consistently at **build time**. The framework embeds the key in build output for runtime use; a runtime-only setting is not a substitute for consistent builds. Protect release artifacts and consider client refresh/version skew during rollback. An encryption key alone does not make different Server Action IDs/builds compatible. No custom key or deploymentId infrastructure is introduced by this preparation.

Local evidence: `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` (Server Functions encryption key / version skew) and `01-app/01-getting-started/15-route-handlers.md`. No additional framework runtime secret is required; internal auth's application signing secret is required separately.

## Rollback and first-deployment blockers

Before release approval, resolve:

- PIONEERSERV app/service registration, critical classification, owner/on-call, release/log/env paths, runtime account, approved port, proxy/DNS/TLS and firewall rules.
- Dedicated replica-set staging database, permissions, topology/TLS and backups; confirm no pre-existing `Pioneer` identity/data needs migration.
- Reviewed internal auth mode, protected signing secret, explicit first-admin/auth-index procedure and approved company assignments, or a working external issuer/audience/JWKS bridge. Confirm password-only auth meets platform policy. Dev auth must remain unavailable.
- Explicit bootstrap/fiscal-default approval, then verification of required indexes and four canonical company IDs. Health success alone does not satisfy this step.
- Review/commit/push authorization and selection of a deployable approved revision. This working tree is intentionally uncommitted.
- A staged NSSM startup/shutdown/health and authorized-accounting acceptance check under the actual service identity; server integration was not exercised here.

Keep prior release/env revision references and compatible artifacts. For a code rollback, stop/drain the service, switch the service release pointer/working directory and arguments to the previous approved build, and run health/auth checks. Expect browsers to reload after a build change. Preserve centralized secrets deliberately; do not blindly roll back rotated credentials.

Internal sessions require an internal-auth-capable release. A pre-bridge rollback needs a functioning external issuer/configuration; never enable DEV_AUTH to regain access. Preserve auth collections and the current signing secret. Restoring an old compromised key can re-enable its unexpired stored sessions. See [PRODUCTION_AUTH.md](PRODUCTION_AUTH.md) for session/key rotation and operator recovery procedures. NSSM/build/start must never invoke `scripts/auth-user.ts` automatically.

Never roll back MongoDB simply to match a code release. Posted journals are immutable history; deleting/replaying financial records is not an application rollback. Future schema changes require separately reviewed backward compatibility and financial reconciliation. Validate backups and restoration in isolation, and require explicit accounting-owner authorization for any data recovery. No data migration or schema mutation is included in this preparation beyond documenting the existing bootstrap process.

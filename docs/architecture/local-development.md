# Local development

This workflow is opt-in, loopback-only, and separate from Pioneer production identity. It requires no production database, identity provider, Docker installation, MongoDB service changes, or production credentials.

## Exact startup

From `C:\Dev\FinancialAgent`:

```powershell
npm ci
npm run dev:setup
npm run dev:db:start
```

Keep that terminal open. Wait for `Primary ready`. In a second terminal in the same directory:

```powershell
npm run dev:db:status
npm run dev:bootstrap
npm run dev
```

Open **https://127.0.0.1:3445/dev/sign-in**. The generated certificate is self-signed and scoped to loopback. On the first visit, inspect the certificate and accept the browser's exception for this exact local site (Chrome/Edge: Advanced → Proceed). Do not disable TLS validation globally. No root certificate is installed by these scripts. If organizational policy blocks local certificate exceptions, ask your administrator for an approved local certificate and place its matching key/certificate at `.local/https-key.pem` and `.local/https-cert.pem`.

Click **Sign in as Local Finance Developer**. A **Development Session** banner remains visible across financial pages. Choose the company explicitly. Use **End development session** to clear the local cookie.

`dev:setup` creates `.env.local` only when absent, with a random signing secret and local-only settings; it never overwrites an existing environment file. It generates an ignored local HTTPS key/certificate pair. Rerunning preserves both the secret and certificate. No secret is printed. If an existing `.env.local` contains non-local or incomplete settings, setup fails with instructions rather than replacing it. To configure manually, copy `.env.example` to `.env.local`, fill the values below, and generate a private random 32-byte hex secret through a local secret-generation tool before running setup. Keep the secret out of source control, logs and NEXT_PUBLIC variables.

```text
MONGODB_URI=mongodb://127.0.0.1:27291/financialagent_dev?replicaSet=financialagent-dev&directConnection=true
APP_BASE_URL=https://127.0.0.1:3445
DEV_AUTH_ENABLED=true
DEV_AUTH_SECRET=<64 hexadecimal characters generated locally>
BOOTSTRAP_ACTOR=dev:local-finance
```

Leave Pioneer AUTH_ISSUER, AUTH_AUDIENCE, AUTH_JWKS_URL and service credentials unset for local use. Do not copy production secrets. Do not set NODE_ENV=production for local commands; they refuse non-development environments. `DEV_AUTH_LOCAL_LAUNCH` and `FINANCE_LOCAL_DEV_BUILD` are internal launcher settings, not settings to add to `.env.local`.

## MongoDB topology and ownership

The existing `mongodb-memory-server` development dependency launches a **real native MongoDB 8.0.12 process** using WiredTiger, one replica-set member, and persistent `.local/mongodb` storage. Despite the dependency name, this workflow is not an ephemeral in-memory database. The first use may download/cache the binary. Runtime production code does not depend on this launcher.

| Property                           | Value                  |
| ---------------------------------- | ---------------------- |
| Database                           | financialagent_dev     |
| Replica set                        | financialagent-dev     |
| MongoDB address                    | 127.0.0.1:27291        |
| Authenticated lifecycle controller | 127.0.0.1:27292        |
| App URL                            | https://127.0.0.1:3445 |
| Data directory                     | .local/mongodb         |
| App build directory                | .next-local            |

MongoDB is bound only to IPv4 loopback. This is a trusted-single-developer-machine database without MongoDB account authentication; local processes on the machine can access it. It contains no real financial information. Do not forward these ports or expose them through tunnels/proxies.

The machine already had other applications/MongoDB instances occupying earlier candidate ports. These scripts deliberately use different ports and data files. No installed MongoDB service is reconfigured or stopped. A real installed mongod exists outside PATH; using the repository's versioned launcher avoids depending on its service configuration or changing it.

Start refuses an occupied MongoDB or controller port. It never reuses whatever happens to answer on port 27017 or kills by a stale PID. The controller uses a random per-start token stored in ignored `.local/db-control.json`; status/stop verify both the workspace and database identity. Start initializes the set and waits for primary readiness. Status/bootstrap/startup verify the expected set and writable primary. MongoDB standalone deployments produce an explicit transaction requirement error in the app.

Commands:

```powershell
npm run dev:db:start   # foreground; keep terminal open
npm run dev:db:status  # verify intended controller, replica identity and primary
npm run dev:db:stop    # stop only this launcher's instance; retain data
npm run dev:db:reset   # interactive: type RESET financialagent_dev
```

Reset works only with the exact pinned URI and development configuration, verifies the controller and primary, prints the target, and drops only `financialagent_dev` after the exact confirmation. It does not delete the data directory, touch other databases, or reset the replica-set configuration. Stop the app before resetting and run `npm run dev:bootstrap` afterward. No force flag or generic drop target exists.

## Development identity and server gates

The only operator is `dev:local-finance`, displayed as Local Finance Developer, with the four permanent company IDs and finance:read/finance:write. Audit metadata records `human:dev:local-finance`. No banking/payment/payroll scopes or production user is created.

`POST /dev/session` issues a real HS256 JWT, with a development-specific issuer, audience, subject, marker and one-hour expiration. It uses a **separate** `__Host-finance-development` cookie with Secure, HttpOnly, SameSite=Strict, Path=/, no Domain. The cookie is never accepted as a Pioneer session. Assignment/scopes come from fixed server-side development configuration, not browser-supplied identity fields. HTTPS is preserved; no global cookie security relaxation exists.

Issuance and verification require all of:

- NODE_ENV exactly development, not merely non-production;
- DEV_AUTH_ENABLED exactly true;
- exact loopback HTTPS APP_BASE_URL and expected request Host;
- exact dedicated development MONGODB_URI;
- valid private 32-byte hex development secret;
- internal marker from the launcher that binds Next to IPv4 loopback;
- no remote/ambiguous forwarded peer metadata;
- exact Origin on sign-in, logout and all financial mutations.

`npm run dev` uses the guarded local launcher and supplies its internal marker. `npm run dev:local` remains an equivalent alias. Running `next dev` directly does not supply that marker. Do not publish the local launcher behind a reverse proxy. Host/Origin checks complement the actual loopback socket binding; they are not proof of peer locality by themselves.

`/dev/sign-in` and `/dev/session` return 404 when unavailable, including production builds with dev flags present. The application session adapter gives a provided Pioneer cookie precedence and never falls back to local identity after a Pioneer verification failure. The original RS256/JWKS Pioneer verifier remains unchanged. Production ignores development cookies. Accounting services receive the same human principal shape and use unchanged company/scope policy.

## Bootstrap and seed behavior

`npm run dev:bootstrap` pins the local database and operator, checks the managed replica set and calls the existing idempotent bootstrap. It creates only missing companies and required indexes. No accounts, periods, journals or opening balances are seeded. The existing `npm run bootstrap` remains the explicit environment-configured operator command for other deployments.

`npm run dev` verifies primary availability, all four companies and the required unique indexes before starting Next. It does not bootstrap silently. `.next-local` keeps this launch separate from ordinary `.next` dev/build output, including an already running ordinary Next development server.

No demo-seed command is provided. `npm run dev:verify` is an explicit browser validation command that creates clearly labelled DEV VALIDATION accounts, an open current-year period when needed, and a posted/reversed journal in the local database. It is never run by startup. This deliberate validation leaves its records available for inspection; reset is separate and confirmed.

## Manual accounting cycle

1. Follow startup, bootstrap and development sign-in above.
2. Select Pioneer Industries; confirm its name above the form.
3. Open Chart of Accounts. Create 1000 / Cash / Asset and 3000 / Equity / Equity (or unique local codes if those already exist).
4. Open Accounting periods. Create a period covering today's transaction date; do not overlap an existing period.
5. Open Journal entries. Enter today's date and a clearly local test description.
6. Select Cash on the debit line and Equity on the credit line. Enter 12345 debit cents and 12345 credit cents ($123.45).
7. Save balanced draft, open Review entry, inspect the lines and company, and confirm Post reviewed journal.
8. Open Trial Balance for an as-of date including the entry. Confirm the two balances and equal totals. Drafts do not contribute.
9. Open General Ledger for the relevant date range; inspect the entry and per-account running balance.
10. Return to the journal, enter a reversal date in an open period and a reason, then confirm Reverse journal.
11. Follow the reversal link. Confirm equal/opposite lines, original reference and development actor metadata.
12. View reports including the reversal date. The original/reversal pair nets to zero; unrelated entries remain unchanged.
13. End the session, stop/restart the app, and sign in again. Data remains in MongoDB. Stop/restart the database to verify persistent storage if needed.

## Production prerequisites and differences

Production still requires the real Pioneer identity bridge, trusted HTTPS/JWKS, assigned companies/roles, a provisioned replica set, explicit bootstrap/index creation, backups and accounting acceptance. Production builds do not expose local sign-in even if an operator mistakenly leaves development flags set. Build output may list the dev routes, but both are server-side inaccessible (404).

Do not deploy `.env.local`, `.local`, `.next-local`, test fixtures or development credentials. The development secret cannot validate a Pioneer RS256 session. Disabling DEV_AUTH_ENABLED returns the original authentication behavior. No automatic bootstrap, demo data or local MongoDB selection is added to ordinary production startup.

## Troubleshooting

| Symptom                                  | Action                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mongo not running/controller unavailable | Run dev:db:start in another terminal and wait for Primary ready.                                                                                                                                 |
| Port occupied                            | Identify the other process; scripts deliberately refuse to reuse/stop it. Do not redirect to another URI. Resolve the conflict before retrying.                                                  |
| Replica set not initialized/no primary   | Inspect the dev:db:start terminal; restart only through dev:db:stop/start. Never run rs.initiate against an unrelated instance.                                                                  |
| Wrong MONGODB_URI                        | Restore the exact local URI above. The tools fail before connecting to a mismatched URI.                                                                                                         |
| Missing company/indexes                  | Run dev:bootstrap against the managed local primary.                                                                                                                                             |
| Dev auth disabled or sign-in 404         | Run dev:setup; verify local flags/secret and use npm run dev, not npm start. Production deliberately returns 404.                                                                         |
| Wrong origin/host                        | Use https://127.0.0.1:3445 exactly, not localhost, a LAN IP or a different port.                                                                                                                 |
| Cookie/session failure                   | Accept only this site's local TLS certificate, sign in again, or clear this site's cookies. Sessions expire after one hour. A stale Pioneer cookie takes precedence; clear it for local testing. |
| Missing company after sign-in            | Run explicit local bootstrap and select a company; no company is auto-selected.                                                                                                                  |
| No open/closed period                    | Create a nonoverlapping open period covering the transaction/reversal date. Closed periods remain protected.                                                                                     |
| Existing .env.local rejected             | It is never overwritten. Review it locally; move it aside yourself if appropriate and rerun dev:setup. Do not paste secrets into support messages.                                               |
| Interrupted database process             | Keep .local/mongodb. Verify the old process stopped before restarting. Port checks prevent unsafe reuse; WiredTiger handles normal recovery.                                                     |
| Certificate expired/incomplete           | Replace the matching local certificate pair with an approved pair, or move both files aside and rerun setup. Never disable TLS checks globally.                                                  |

Automated checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:browser`. With the documented local server/database running, `npm run dev:verify` exercises the real development sign-in and accounting UI separately from production-auth browser fixtures.

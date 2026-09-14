# Production authentication

FinanceAgent is a **critical accounting application** at `https://finance.pioneercryo.com`. These are future operator procedures, not deployment authorization. No production connection, user creation or accounting bootstrap was performed during implementation.

## Architecture and audit

The repo has no Pioneer identity issuer, login callback or identity-management service. `src/lib/auth/session.ts` verifies externally issued RS256 JWTs against `AUTH_ISSUER`, `AUTH_AUDIENCE` and HTTPS `AUTH_JWKS_URL`. Required claims are `sub`, `iat`, `exp`, `companies` (IDs), and `scopes` (`finance:read`/`finance:write`); maximum token age is one hour. The cookie is `__Host-finance-session`. This path remains available as `AUTH_MODE=external` (the default when unset); it still needs a separately operated issuer/bridge. External sessions retain their existing expiry-based revocation behavior. Internal login/logout routes return 404 in external mode.

The self-contained bridge uses explicit `AUTH_MODE=internal`, without an external identity provider. It verifies operator-created users using Node scrypt (N=131072, r=8, p=1, random 32-byte salt, 64-byte derived key, versioned format). Passwords require at least 15 characters and at most 256 UTF-8 bytes, are never truncated for verification, and are never stored/logged in plaintext. Use a password manager and unique generated passwords. There is no public registration, password-reset email, third-party login or development bypass.

Internal sessions use HS256 with a dedicated 256-bit random secret, canonical application origin as issuer and `finance-internal-session` as audience. JWTs contain subject, random session ID, issued-at and expiry, without passwords, signing keys, company lists or roles. Every authenticated request also reads an unexpired MongoDB session and the current enabled user/version. Roles and companies come from that user record, never browser input. A database outage rejects internal sessions. Logout revokes the server-side session.

`requestHumanSession()` gives the human cookie precedence; an invalid cookie never falls back to development identity. DEV_AUTH settings and cookies are only usable in the explicitly gated local development launcher. `/dev/sign-in` and `/dev/session` remain unavailable in production even if DEV_AUTH variables are mistakenly present.

There is no middleware/proxy authentication layer or Server Action mutation layer. `FinancePage` gates rendered financial data, `/api/finance` authenticates each request, and accounting/reporting services enforce `authorize()` for company membership, required scope and human-only financial writes. These checks remain unchanged. The unauthenticated workspace shows a sign-in-required state and, in internal mode, a `/sign-in` link; the finance API returns 401. Services remain a separate bearer-token path.

## Runtime environment

| Variable | Internal mode | External mode |
| --- | --- | --- |
| `NODE_ENV` | `production` | `production` |
| `MONGODB_URI` | Dedicated FinanceAgent replica set; also stores auth records | Dedicated FinanceAgent replica set for accounting |
| `APP_BASE_URL` | `https://finance.pioneercryo.com`: canonical HTTPS origin, no path/query/userinfo | Canonical HTTPS origin for mutation checks |
| `AUTH_MODE` | Explicit `internal` | `external`, or unset for compatibility |
| `AUTH_SESSION_SECRET` | Required: 64 lowercase hex characters representing 32 random bytes | Unused |
| `AUTH_ISSUER` | Unused | Required exact issuer URL |
| `AUTH_AUDIENCE` | Unused | Required exact application audience |
| `AUTH_JWKS_URL` | Unused | Required reachable HTTPS RS256 JWKS endpoint |
| `SERVICE_CREDENTIALS_JSON` | Optional service-only hash configuration; default `[]` | Same |

The operator-reported target is `mongodb://127.0.0.1:27018/finance_agent?replicaSet=finance-rs`; it was not contacted. Configure approved DB authentication/TLS and least privilege appropriate to that server. Internal auth uses only `auth_users`, `auth_sessions`, and `auth_attempts` in the selected database. The operator CLI creates auth indexes explicitly; runtime does not create indexes or run bootstrap. Runtime reads users and writes sessions/attempt counters; separate runtime and index/user-management operator privileges where practical. The existing topology guard still requires the dedicated replica set. Auth collections do not contain accounting records.

Generate `AUTH_SESSION_SECRET` with a cryptographically secure secret manager or Node `crypto.randomBytes(32).toString('hex')` in a private operator session. Write it directly into the centralized ACL-protected env file. Do not paste it into tickets, command arguments, source, browser variables or logs. It is a runtime secret; builds require no auth secrets. Never prefix auth settings with `NEXT_PUBLIC_`. Protect backups containing password hashes and server access as well.

## Explicit first-admin procedure

After a separately approved release and environment are available, verify the selected host, env file, dedicated database, approved company assignments and operator privileges. Run manually from that release with tsx tooling installed. Replace placeholders. Passwords are prompted twice without echo and are not accepted through command arguments or environment variables. The command refuses redirected/noninteractive password input and requires an explicit matching database name.

```powershell
& '<NODE_EXE>' '--env-file=<CENTRAL_ENV_FILE>' '.\node_modules\tsx\dist\cli.mjs' '.\scripts\auth-user.ts' first-admin --expected-database finance_agent --username '<OPERATOR_LOGIN>' --companies 'pioneer-industries'
```

Specify only approved existing company IDs, comma-separated. Other canonical IDs are `317-graphics`, `headquarters-on-main`, and `fish-properties`. This command does not seed or modify companies, accounts, periods, journals, audit records or opening balances. It does not call `scripts/bootstrap.ts`. First-admin is allowed only when the auth-user collection is empty and uses a fixed unique ID so simultaneous attempts cannot create two initial administrators. Repeating it after success refuses; it is not a password-reset command. A failure can leave auth indexes created but never stores plaintext credentials. Failures are sanitized; inspect arguments, user state and permissions without logging secrets.

`admin` and `accountant` both grant `finance:read` and `finance:write` only within assigned companies; `viewer` grants `finance:read`. Admin does not bypass accounting policies and has no browser user-administration privilege. User management is an explicit database-privileged operator procedure:

```powershell
# Additional user: role and company assignments are explicit.
& '<NODE_EXE>' '--env-file=<CENTRAL_ENV_FILE>' '.\node_modules\tsx\dist\cli.mjs' '.\scripts\auth-user.ts' create-user --expected-database finance_agent --username '<LOGIN>' --role viewer --companies 'pioneer-industries'
# Reset password and revoke prior sessions; does not re-enable a disabled user.
& '<NODE_EXE>' '--env-file=<CENTRAL_ENV_FILE>' '.\node_modules\tsx\dist\cli.mjs' '.\scripts\auth-user.ts' reset-password --expected-database finance_agent --username '<LOGIN>'
# Disable a user and revoke prior sessions.
& '<NODE_EXE>' '--env-file=<CENTRAL_ENV_FILE>' '.\node_modules\tsx\dist\cli.mjs' '.\scripts\auth-user.ts' disable --expected-database finance_agent --username '<LOGIN>'
```

Usernames are case-insensitive, trimmed, 3–100 ASCII letters/digits plus `.`, `@`, `_`, `-`, starting with a letter/digit. Reset/disable changes the user version before session cleanup; old sessions fail even if cleanup is delayed or concurrent login finishes afterward. Role/company edits are not exposed through a browser endpoint; use a separately reviewed operator process. Current assignments are checked every request.

## Login, verification and logout

- GET `/sign-in`: server-rendered form, no secrets. Invalid credentials show a generic error. Missing configuration shows unavailable, never a bypass.
- POST `/auth/session`: form-urlencoded only, streamed body limited to 4 KiB. Checks exact configured Origin before reading credentials, verifies password, creates a fresh session, revokes the browser's previous session, sets the cookie, redirects to `/companies`. No user-provided redirect target.
- GET `/auth/session`: verifies cookie; returns only principal ID, companies and scopes; 401 without a valid session. Never returns a token or accepts service bearer credentials as a human identity.
- POST `/auth/sign-out`: exact Origin required; deletes session, clears cookie, redirects to `/sign-in`. Copied cookies fail afterward. Expired/tampered cookies can be cleared; DB errors return failure instead of claiming revocation. GET cannot log out.

Cookies use `__Host-finance-session`, `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, no Domain, and maximum age **3600 seconds**. Sessions have fixed one-hour absolute expiry, no sliding refresh/remember-me. Signed and DB expiry are checked independently of TTL cleanup. Logout cannot undo an already authorized in-flight request.

Auth route responses are private/no-store. Login/logout and human financial writes require exact canonical Origin; missing, sibling-subdomain, foreign and `null` origins are rejected. This is the CSRF defense alongside Strict cookies. The proxy must preserve browser Origin and HTTPS; forwarded headers/IPs are not trusted for identity or rate-limit exemptions. Never log request bodies, cookies, authorization headers or credentials.

Mongo-backed fixed 15-minute windows allow 10 attempts per normalized username and 60 total per application window; excess attempts return 429 with Retry-After. Unknown and disabled users get the same credential failure response and hashing work. Only one scrypt operation runs per Node process; concurrent attempts receive 429. Limits survive restarts and bound hashing memory. A deliberate attack can exhaust the global login allowance, and fixed windows permit a boundary burst: an intentional availability tradeoff for this small internal app. Platform access restrictions/rate controls and monitoring should complement this. MFA/SSO and self-service recovery are not implemented; if Pioneer policy requires them, release is blocked pending an approved integration.

## Services, rotation and rollback

`SERVICE_CREDENTIALS_JSON` stays an array of `{id,sha256,companies,scopes,expiresAt}`. `sha256` is a lowercase SHA-256 digest of an independent bearer token of at least 32 characters; expiry is an ISO timestamp. Supported service scopes remain `finance:read`, `finance:source:write`; reserved `ar:read`, `ap:read`, `cfo:read` do not create endpoints. Services cannot obtain human cookies or broad `finance:write`. Never put human credentials here. External RS256 and internal HS256 verification are mode-exclusive with no algorithm/key fallback.

Rotate the internal signing secret atomically across all app processes and restart them together: **existing internal sessions become invalid immediately**. There is no previous-key grace period. Preserve the new secret across rollback: restoring a compromised old secret could make its unexpired DB sessions usable again. Rotation never requires deleting accounting data. Password reset/disable revokes one user's sessions through version checks and cleanup. TTL indexes eventually remove expired auth records.

Rollback selects a reviewed compatible release and matching `AUTH_MODE`, preserves auth collections, and tests health, sign-in, permissions and logout. Releases predating internal mode cannot authenticate these cookies; external-mode rollback needs a working real external issuer and signs internal users out. Never use DEV_AUTH as rollback access, automatically rerun first-admin/accounting bootstrap, or restore/delete accounting records to repair login.

Before release: review implementation/operator commands, provision the independent secret, approve password-only auth against Pioneer MFA policy, approve company assignments, run the explicit auth-user procedure, and validate the real HTTPS/proxy/NSSM flow. Health checks do not verify authentication readiness. No real user or signing secret is included in source.

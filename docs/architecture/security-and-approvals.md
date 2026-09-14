# Security and approvals

## Implemented boundary

Pages verify the `__Host-finance-session` cookie server-side before rendering financial UI. The API independently verifies identity and every domain operation independently checks company/scope. Human JWTs require RS256 signature from configured HTTPS JWKS, exact issuer/audience, sub, iat, exp, maximum one-hour age, and validated companies/scopes claims. Financial writes require finance:write and human identity. Human mutation requests require exact configured Origin. Browser code never receives service credentials or JWTs from the application.

No identity provider, login/password database or Pioneer sign-in pattern existed in this repository. A secure verification boundary is implemented; actual Pioneer sign-in issuance is deliberately scaffolded. A trusted provider/bridge must issue this application-specific token after authenticating the user and resolving server-owned company assignments. It must set a Secure, HttpOnly, SameSite=Lax or Strict, Path=/ cookie without Domain. Never accept company/scope claims from a browser form or unverified header. No production bypass or default production user exists. HTTPS is required for browser sessions. Token revocation is currently bounded by the one-hour lifetime; immediate revocation requires provider/session integration.

Service configuration is server-only JSON: records have id, sha256, companies, scopes, expiresAt. Generate random tokens with at least 32 bytes of entropy, store only hashes in configuration and deliver plaintext through a secret manager. Configure independent credentials per integration and company/scopes, set expiration, and rotate by removing the old hash. No plaintext token or example secret is committed. Timing-safe comparisons verify hashes. Unknown, expired and broad finance:write service credentials are rejected. Service draft ingestion never posts automatically.

Runtime environment validation is lazy, so production builds need no live secrets/database. Missing config denies access or fails the requested operation. The bootstrap actor and database credentials are explicit operator configuration. Bootstrap is a privileged CLI action, not a public route.

## Isolated local development identity

Local development has a separate opt-in signed session, described in [local development](local-development.md). It requires NODE_ENV=development, explicit DEV_AUTH_ENABLED, a private local secret, the pinned financialagent_dev loopback URI, the exact HTTPS loopback Host/Origin and the loopback-only launcher. It uses a separate Secure/HttpOnly/SameSite=Strict cookie and fixed development operator with normal company/scope authorization and audit attribution. No production user or password is created.

Both development issuance routes are unavailable (404) in production, even with development flags configured. Production ignores development cookies. The existing Pioneer JWT/JWKS verification function remains unchanged and has precedence; verification failures cannot fall back to development identity. Do not deploy `.env.local`, `.local` or development signing assets. No production authentication bypass exists.

## Approval semantics

The UI asks a human to confirm posting/reversal/period closure. The domain verifies the human finance:write role and records actor metadata. This phase does not implement a second approver, approval queue or evidence-of-approval token; API calls by authorized humans are direct commands. Future AI/Managers must not receive a human cookie or broad write scope.

Future high-risk actions require explicit scoped, amount-aware authorization: journal posting, write-offs, vendor payments, bank transfers, payroll submission, tax payment and reconciliation close. Approval should bind company, record version, amount, destination and expiration. Separate proposal, approval and execution; reapproval is needed when material data changes. No such execution APIs exist now.

## Deployment requirements and limitations

- Provision replica-set MongoDB with TLS, backups, restore testing and dedicated least-privilege runtime credentials. Run explicit bootstrap/index creation before accepting writes. Never point tests at a live database.
- Restrict direct collection writes; Mongoose models are internal persistence code and domain services are the business-rule boundary. Database administrators can bypass application invariants. Audit is append-only by application contract, not a cryptographic external archive.
- Configure HTTPS session bridge, identity assignments, provider MFA policy and access review before real use. No public self-registration.
- Configure edge request-size limits, rate limiting, operational monitoring and secret rotation for deployment. The API checks a 256 KB body limit after reading; edge enforcement is needed to cap ingress memory.
- Reports read matching history in memory and fail on unsafe integer totals. Benchmark volume and add bounded report jobs before large historical migration.
- No AR/AP, payment/bank/payroll execution, bank feeds, direct ERP database access or QuickBooks import exists.

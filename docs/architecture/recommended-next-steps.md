# Recommended next steps

First, complete the trusted Pioneer identity-provider bridge and validate named-user company assignments, read-only versus accountant permissions, HTTPS cookies, session expiry and revocation. Provision an isolated staging MongoDB replica set, run explicit company/index bootstrap, confirm fiscal settings with the accountant, and perform acceptance testing of the implemented journal lifecycle before any real finance records are entered.

After operational acceptance, the next finance-domain increment should be a narrowly scoped ERP customer-invoice financial projection with a versioned idempotent intake contract, approved chart-of-accounts mapping and reviewed draft creation. Define source corrections and reconcile projection totals to journal control accounts. Do not combine this with payment execution or a full AR rebuild.

AR settlement, AP settlement, banking reconciliation, scheduled payments, payroll/tax liabilities and CFO projections require separate approved scopes. Add report pagination/materialization, deployment rate limiting, monitoring and restore drills as volume grows. Keep each company's books isolated throughout.

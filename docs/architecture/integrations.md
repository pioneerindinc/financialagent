# Integration boundaries

## Implemented

The service credential verifier supports dedicated IDs, SHA-256 token hashes, expiration, company allowlists and explicit scopes. No default credentials exist. `finance:source:write` permits draft creation only; `finance:read` permits company-scoped accounting reads. `ar:read`, `ap:read`, `cfo:read` are recognized future scope names but confer no implemented endpoints. Service credentials cannot post, reverse, create accounts, or close periods. No ERP connection exists.

`POST /api/finance` accepts JSON `{companyId, action, data?, id?, revision?, date?, reason?}`. Actions are account.create, account.edit, period.create, period.setup2027, period.close, journal.create, journal.edit, journal.post, journal.reverse. Services are authorized per action; no action name grants a scope. The draft data contract is transactionDate, description, sourceSystem, sourceType, sourceId, sourceRevision, and lines[{accountId,debitCents,creditCents,memo}]. Invalid data returns 400; unauthenticated 401; forbidden 403; missing 404; conflicting revision/source 409. Duplicate source data resolves to the existing document. There is no automatic posting on ingestion.

`GET /api/finance?company=...` returns overview. `view=journal&id=...` returns a scoped journal. `view=trial-balance&asOf=YYYY-MM-DD` returns a statement. `view=general-ledger&from=...&to=...&account=...` returns ledger rows. These responses are private/no-store. Caller identity always comes from verified credentials, never JSON actor fields.

## Planned ERP flow

Pioneer ERP authoritative operational customer invoice → versioned FinancialAgent source contract → FinancialAgent AR record → accounting draft → human/system-controlled posting policy. ERP owns the operational invoice; FinancialAgent is planned to own financial AR/payment/settlement truth. The current implementation requires human final posting; any future system posting policy needs separate review.

Future adapters should accept eventId, schemaVersion, companyId, sourceSystem, sourceType, sourceId, sourceRevision, occurredAt, evidence reference and financial payload. Validate company assignment, scope, account mapping and event identity. Store ingestion outcome and support retries/quarantine. Do not connect directly to Pioneer MongoDB.

Customer invoice issued creates an immutable financial source projection with source invoice/customer identity, currency and validated amount. Vendor bill/source receipt evidence retains vendor/source IDs and evidence lineage; accounting recognition depends on approved policy. Payment-relevant source identities must be stable across delivery retries. Inventory accounting events require separately approved valuation and recognition rules before ingestion is enabled. New source revisions never blindly post another full invoice.

## Planned manager read projections

Collections: invoice original financial amount, paid amount, remaining amount, applications, settlement status, last payment date, source identity, company, asOf and projection version.

Payables: bill financial balance, original/paid/remaining amounts, payment state, planned and scheduled dates, actual paid date, applications, source identity, company and asOf.

Obligations: vendor payments due/scheduled, payroll liabilities/dates, tax liabilities, loan payments, card payments and recurring financial obligations. Return stable obligation IDs, company, due amount, dates, currency, status, source references and freshness. Managers consume projections and may propose actions; FinancialAgent remains authoritative for recorded financial status.

All future APIs must enforce the same company and credential scopes, distinguish observed data from recommendations, and carry freshness/cutoff metadata. No external manager may silently execute financial writes.

All source journal lines must reference active posting accounts. Posting control accounts can prohibit manual entries while accepting authenticated source drafts. Header/nonposting accounts are rejected at draft creation and final posting regardless of service credentials. No AR record/connector is implemented by these governance changes; existing source identity/fingerprint idempotency remains authoritative.

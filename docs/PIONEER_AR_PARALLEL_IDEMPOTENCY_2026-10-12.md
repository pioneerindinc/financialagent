# Pioneer ERP parallel import idempotency acceptance — October 12, 2026

**PASS — invoice and accounting idempotency.** One repeat synchronization returned **imported=0, replayed=36, complete=true, mode=parallel**. No invoice, source-version, audit, mapping or financial document changed. The existing transaction wrapper incremented the Pioneer company lock **7 -> 8** and updated its timestamp; this is **not a full database no-op**.

## Scope and authorization

The user explicitly authorized one repeat of the accepted development parallel import for company `pioneer-industries`, contract `pioneer-customer-invoices-v1`, inclusive dates **2026-10-01 through 2026-10-12**, page size 50. Exactly **one synchronization POST** was submitted through authenticated `POST /api/ar`, action=sync, mode=parallel. There was no automatic retry, subsequent synchronization or accounting action.

Verification completed **2026-10-12T18:49:14.552Z** (2:49:14 PM EDT). Supported stateless development sign-in and normal company/finance permissions were used; no direct database writes or fabricated actor bypass occurred.

## Preflight and revision comparison

- Confirmed exact local URI `mongodb://127.0.0.1:27291/financialagent_dev?replicaSet=financialagent-dev&directConnection=true`, authenticated lifecycle-controller identity, and MongoDB hello for replica set financialagent-dev.
- Verified development authentication, exact loopback HTTPS application origin, Pioneer company binding, approved local ERP origin, and authoritative AR disabled. Runtime overview confirmed the disabled gate before and after synchronization.
- Confirmed mapping **version 2 / 169 rules**, AR control **1100**, current account safeguards, and unchanged approved mapping payload.
- The fresh complete strict v1 scan returned **36 invoices / 158 lines / $43,501.32**. All 36 source identities, revisions, full-record fingerprints and retained payloads matched stored versions before submission.
- Baseline was 36 projections, 36 versions, 36 import audits, zero journals, zero journal drafts, zero drafted AR versions, and company lockVersion 7. Whole-database fingerprints remained stable through preflight and authentication.
- A second complete read-only scan after synchronization reproduced the same source revision and payloads. Every stored projection still points to its original version. No duplicate source identity or invoice/revision pair exists.
- Both diagnostic scans completed in one GET each; the synchronization service fetched its own complete scan using the existing client and protections.

Unchanged scan revision:

`7bdaee65dcedb8e623bda2ba5225772dc2e68f18f503339311e8a446b3e65e7b`

## Before/after evidence

| Collection / invariant | Before | After | Result |
| --- | --- | --- | --- |
| Invoice projections | 36 | 36 | Every document unchanged |
| Source versions | 36 | 36 | Every document unchanged, including payloads, timestamps and head links |
| Import audits | 36 | 36 | No new import audit |
| All audits | 97 | 97 | Every audit unchanged; no synchronization-attempt audit |
| Journals, all statuses | 0 | 0 | No journals or journal drafts |
| Drafted AR versions | 0 | 0 | No AR drafts |
| Accounts, including bank/control accounts | 53 | 53 | Every document unchanged |
| Stored mapping revisions | 2 | 2 | Every document unchanged; current version 2 / 169 rules |
| Periods | 0 | 0 | Unchanged |
| Companies | 4 | 4 | Only Pioneer lockVersion and updatedAt changed |
| Pioneer lockVersion | 7 | 8 | Expected transaction-wrapper increment |
| Auth attempts / sessions / users | 8 / 4 / 1 | 8 / 4 / 1 | Every document unchanged |
| Mapped lines / source invoice value | 158 / $43,501.32 | 158 / $43,501.32 | Fully reconciled |
| Recognized receivables in AR overview | $0.00 | $0.00 | No posted or reversal journal links |

BSON-typed document fingerprints and index definitions were compared across all **11 namespaces**. There were no added or removed documents or namespaces and no index changes. All documents other than the Pioneer company document matched exactly; stripping only lockVersion and updatedAt from that company document also produced an exact match. Verification produced no further database changes.

All 36 projections remain **parallel / needs-review**, with only the intentional issue “Parallel / non-authoritative: projection only; no journal or opening AR.” All 158 lines still resolve under the approved mapping; no source or classification exceptions appeared. No payment, bank, customer-balance or journal operation was invoked. Accounts and every non-company collection were unchanged. This database has no separate payment/customer-balance/bank-transaction collections; no new ones appeared.

## Audit and lock semantics

`src/domains/ar/service.ts:importScan` finds an existing invoice/revision, checks the full source fingerprint and ingestion mode, increments the response's replayed counter and continues. It does not save the existing projection/version or emit `ar.import` on this branch. No synchronization-attempt audit is implemented for these replays.

However, `src/domains/accounting/service.ts:write` increments Company.lockVersion at the start of every authorized company-write transaction to serialize concurrent work. `importScan` validates that increment against the company version captured before scanning. Consequently an all-replay synchronization still commits the lock increment and Mongoose updatedAt change. This behavior was identified before execution and matched the observed result; it is not a hidden invoice import or an audit event.

The request carried this meaningful reason, but **no new audit stores it** because all revisions were replays:

> User-authorized one-time idempotency acceptance check: repeat October 1-12 2026 Pioneer parallel synchronization; expect 36 replayed revisions, zero new imports or financial entries; preserve mapping v2 and authoritative AR disabled.

The current implementation therefore provides projection/version/accounting idempotency, **not write-free synchronization**. No implementation change was made to force a stronger no-op guarantee.

## Conclusion

**Accepted under the existing replay contract:** 36 projections and 36 versions remain; 36 revisions replayed; zero duplicate imports, new audits, drafts, journals, mapping changes or financial balance changes. The sole expected metadata effect is one company-lock/timestamp update.

If a future requirement demands zero company writes for unchanged synchronization, that is a separate concurrency-design change and is not established by this acceptance. No such change was attempted.

Only this documentation report was created. Existing repository changes were preserved. No production access, authoritative activation, ERP write, payment activity, migration, service restart, deployment or commit occurred.

**Stopped after one repeat synchronization.**

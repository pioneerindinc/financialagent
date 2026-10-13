# Pioneer ERP historical parallel import — October 12, 2026

**ACCEPTED: 444 parallel / needs-review projections, 444 source versions, 3,368 lines and $851,377.77; four registered exceptions preserved.** Development company pioneer-industries, period **2025-10-13 through 2026-10-12**. Authorized only for review-only parallel projections, not authoritative accounting.

## Verified pre-import backup

- Directory: `C:\Dev\financialagent\.local\backups\financialagent-dev\20261012T185130Z`.
- Verified at 2026-10-12T18:53:55.098Z: **241 documents, 11 namespaces, 19 indexes, 24 checksum entries**. Includes the accepted 36 October projections/versions, mapping version 2, account 4500, and idempotency-test lock state.
- Native mongodump of the approved development database; complete isolated restore into a different loopback MongoDB data path/port with TTL disabled. No restore over the running database. All disposable processes stopped.
- All BSON-typed document hashes/counts, collection options and index specifications matched; compound-key ordering was preserved while index-list ordering was normalized. Source fingerprints remained unchanged. Private backup ACL grants only the current Windows user, SYSTEM and Administrators.
- Earlier disposable validations were rejected for missing restored indexes despite intact source/dump metadata. A fresh serial restore with journaled writes passed every comparison; only the disposable instance was flushed before shutdown. The earlier validation anomaly's precise cause remains unconfirmed. No import proceeded before successful verification.
- Application-data backup only; server roles/users, oplog, replica configuration and environment/TLS files excluded. This is a local development recovery copy.

## Preflight and exception register

Verified exact database `financialagent_dev` at `127.0.0.1:27291`, replica set `financialagent-dev`, authenticated lifecycle-controller workspace, development guards, company binding, authoritative=false, and persisted **mapping version 2 / 169 rules / AR 1100**. Existing 36 projections and 36 source versions match source identities, revisions, full fingerprints and retained payloads. Baseline: 97 total audits, 36 import audits, zero journals/drafts, company lockVersion 8.

Complete strict v1 scan: **444 invoices / 3,368 lines / $851,377.77**, 13 complete windows, 17 GET pages, no duplicate or undated identities. Existing October identities: 36; new identities: 408. All invoice totals equal the sum of retained line amounts. Expected classification coverage: 3,366 lines / $849,650.98; two unmatched lines / $1,726.79.

| Exception | Date / family | Exact sourceId | Canonical source / line | Preserved values | Required future review |
| --- | --- | --- | --- | --- | --- |
| F1 — zero freight placeholder | 2026-05-21 / standalone-invoice | `5b88de8667a08bf92b9868c8ad9805214f0ebb9256649eb3fe09af43820a384e` | `6a0f305551594cd711a05c13` / line:0 | Unmapped $0.00 line; separate mapped shipping $767.19; invoice $767.19 | ERP owner to confirm placeholder meaning and a legitimate mapping identity; never duplicate header shipping |
| F2 — unidentified inbound freight | 2026-05-29 / standalone-invoice | `bd7ef605fa42aecbba4971c3efcf9a7354a4fb91d6d669bdb442cb17342732ee` | `6a199c092c2ea5a34a57b01b` / line:0 | Unmapped line/invoice $1,726.79; quantity 1 | ERP owner to provide reviewed source identity; no fabricated catalog ID or catch-all mapping |
| Q1 — fractional-cent price | 2026-06-22 / part-sale-invoice | `4a80c819407776c65393408feb794f5ec424168a813e8438038c55c336693a46` | `6a0dfba422169580f8d6edb0` / line:0 | P201 quantity 66; unitPriceCents=null; line/invoice $1,155.88 | Preserve invalid-line-quantity-or-price; later producer/consumer precision design before authoritative use |
| Q2 — fractional-cent price | 2026-07-14 / part-sale-invoice | `261c0c64deff8d3aad1e895b4e10cd385f22b8e238c86f6bb87659592b8c8b0f` | `6a0dfba422169580f8d6edb0` / line:0 | P201 quantity 334; unitPriceCents=null; line/invoice $5,849.44 | Same precision review; a separate source invoice in the same part-sale document |

The previously inspected native prices are $17.5133; v1 represents them as **unknown unitPriceCents**, not zero or a rounded rate, with an explicit flag. The retained projection therefore preserves the validated v1 evidence and exact rounded line/invoice values; it does **not** claim to retain the full-precision native unit price. The full source revision/fingerprint is retained. These are contract-valid review exceptions, not rejected or accounting-ready invoices. No source records or account mappings are altered to hide the issues.

## Batch ledger

All requests use existing authenticated POST /api/ar, action=sync, mode=parallel, page size 50. Complete monthly scans stay below 250 invoices / 5,000 lines; no invoice is split. Four empty source windows and the already accepted October window require no synchronization writes.

| Window | Disposition | Imported | Replayed | Rejected | Exception invoices | Source lines | Source value | Company lock |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2025-10-13–31 | Complete scan; empty, no POST | 0 | 0 | 0 | 0 | 0 | $0.00 | unchanged |
| 2025-11 | Complete scan; empty, no POST | 0 | 0 | 0 | 0 | 0 | $0.00 | unchanged |
| 2025-12 | Complete scan; empty, no POST | 0 | 0 | 0 | 0 | 0 | $0.00 | unchanged |
| 2026-01 | Complete scan; empty, no POST | 0 | 0 | 0 | 0 | 0 | $0.00 | unchanged |
| 2026-02-01 to 2026-02-28 | Accepted; parallel / needs-review | 2 | 0 | 0 | 0 | 37 | $7,030.00 | 8 -> 9 |
| 2026-03-01 to 2026-03-31 | Accepted; parallel / needs-review | 13 | 0 | 0 | 0 | 217 | $43,028.13 | 9 -> 10 |
| 2026-04-01 to 2026-04-30 | Accepted; parallel / needs-review | 19 | 0 | 0 | 0 | 364 | $71,710.95 | 10 -> 11 |
| 2026-05-01 to 2026-05-31 | Accepted; parallel / needs-review | 43 | 0 | 0 | 2 | 406 | $93,866.92 | 11 -> 12 |
| 2026-06-01 to 2026-06-30 | Accepted; parallel / needs-review | 84 | 0 | 0 | 1 | 447 | $128,355.91 | 12 -> 13 |
| 2026-07-01 to 2026-07-31 | Accepted; parallel / needs-review | 93 | 0 | 0 | 1 | 705 | $201,284.03 | 13 -> 14 |
| 2026-08-01 to 2026-08-31 | Accepted; parallel / needs-review | 81 | 0 | 0 | 0 | 496 | $121,343.82 | 14 -> 15 |
| 2026-09-01 to 2026-09-30 | Accepted; parallel / needs-review | 73 | 0 | 0 | 0 | 538 | $141,256.69 | 15 -> 16 |

| 2026-10-01 to 2026-10-12 | Existing accepted records verified; no POST | 0 | 0 | 0 | 0 | 158 | $43,501.32 | unchanged |
| **New import total** | **8 accepted monthly transactions** | **408** | **0** | **0** | **4** | **3,210** | **$807,876.45** | **8 -> 16** |

Exception counts above are distinct invoices with non-mode review issues; they are **accepted flagged projections, not rejected records**. October's 36 existing invoices remain in the full dataset but are not counted as new imports or replays.

## Operation and per-batch verification

Eight successful synchronization POSTs were submitted through the existing application service, under the normal stateless local development session and human finance:write/company authorization. No automatic retry or second synchronization was submitted for any batch. Each service result reported complete=true, mode=parallel, the expected imported count, replayed=0, and the preflight source scan revision.

Before each POST, a fresh strict scan had to match that month's preflight identities, revisions and complete payload digest; full database fingerprints had to match the preceding verified state. The service independently fetched the complete source window and enforced its company-lock check and atomic transaction. After every POST, another strict source scan, all new retained payloads/fingerprints, head/version links, statuses, audit records, counts and financial invariants were verified before proceeding.

Every old database document remained unchanged except the expected Pioneer company lock/timestamp. Each batch added exactly one head, one version and one ar.import audit per new invoice, plus one company-lock increment. No old source revision was superseded and the previously accepted October projections were never resubmitted.

Audit actor: `human:dev:local-finance`. Meaningful per-month reasons identify the exact window, expected invoice count, mapping v2/169 rules, known exception count, and prohibition on accounting/ERP writes. All 408 new audits were checked for correct entity linkage, company, actor, reason, source identity/revision/fingerprint, mode=parallel, status=needs-review, complete scan revision and requested dates. There were no supersession, draft, posting or payment audits.

## Full reconciliation and acceptance

**ACCEPTED — historical development parallel dataset**, verified at **2026-10-12T18:57:00.797Z** (2:57:00 PM EDT).

A fresh final scan covered all 13 windows in 17 GET pages. Every window's scanRevision and complete source digest matched preflight. All 444 source identities, revisions and canonical fingerprints match the corresponding stored versions; all retained fields match the strict source payload with only the intentionally omitted operational context excluded. No duplicate identity, duplicate invoice/revision pair, orphan head or extra version exists. The annual scan is a sequence of stable complete windows, not one cross-year database snapshot.

| Reconciliation | Verified result |
| --- | --- |
| Complete source and stored invoice projections | 444 |
| Stored source versions | 444, exactly one per projection |
| Invoice lines | 3,368 |
| Source invoice values / retained originalAmountCents | $851,377.77 |
| Mapped lines / value | 3,366 / $849,650.98 |
| Unmapped lines / value | 2 / $1,726.79 |
| Fully mapped invoices | 442 |
| Invoices passing pure readiness before mode/cutover gates | 440 |
| Parallel / needs-review projections | 444 |
| Known additional-review invoices | 4, exactly F1/F2/Q1/Q2 |
| Unexpected source discrepancies or rejected records | 0 |
| Existing October heads / versions unchanged | 36 / 36 |

All 444 versions contain the mandatory issue **“Parallel / non-authoritative: projection only; no journal or opening AR.”** The four exception records retain their additional classification or fractional-price flags. No journalId, drafted arAccountId or drafted mappingVersion was assigned to any version. Line classifications were independently evaluated against unchanged persisted mapping version 2.

| Account | Mapped lines | Source line value |
| --- | --- | --- |
| 4100 Repair | 2,394 | $534,824.61 |
| 4200 Parts | 686 | $249,902.04 |
| 4300 Equipment | 58 | $28,285.00 |
| 4400 Shipping | 221 | $35,230.35 |
| 4500 Trucks | 7 | $1,408.98 |
| **Total mapped** | **3,366** | **$849,650.98** |

The two freight lines were not forced into an account. F1 remains a zero-value placeholder with its separately mapped shipping preserved once; F2 remains an unmapped $1,726.79 line. The fractional-price invoices retain exact quantities 66/334, unknown unitPriceCents, exact line/invoice amounts $1,155.88/$5,849.44, and their blocking price flags. Null was not converted to zero, and native fractional prices were not rounded or fabricated.

### Persisted exception links

| Register entry | Financial Agent projection ID | Source version ID |
| --- | --- | --- |
| F1 | `2472be8f-b05a-47ae-890f-81bc9de96dad` | `aa5c9ba0-5635-456c-a963-5d6831998f86` |
| F2 | `bd4a9ddf-c45f-4fbc-aff6-323756b7569b` | `20d41cb7-eb4e-48b1-8ee3-e3489f880a39` |
| Q1 | `bda2ca56-2949-45ad-b1cf-d6a767080e3d` | `33375f6c-4c8f-4d1a-a6a1-96bf358c7613` |
| Q2 | `44a39a36-e619-4120-82b3-7e7b9db6131a` | `0f55048d-01bf-4f7c-ad8f-365e0adb88b2` |

## Financial and configuration invariants

| Namespace / invariant | Before historical imports | After | Change |
| --- | --- | --- | --- |
| accounts, including bank/control accounts | 53 | 53 | Every document unchanged |
| arinvoices | 36 | 444 | +408 review-only projections |
| arversions | 36 | 444 | +408 parallel versions; original 36 unchanged |
| armappings | 2 | 2 | Every document unchanged; latest v2 / 169 rules / AR 1100 |
| audits, total | 97 | 505 | +408 ar.import audits; previous audits unchanged |
| ar.import audits | 36 | 444 | Exactly one per stored version |
| companies | 4 | 4 | Pioneer lockVersion 8 -> 16 and updatedAt only; other company data unchanged |
| journals, including drafts and posted entries | 0 | 0 | None created |
| drafted AR versions | 0 | 0 | None created |
| periods | 0 | 0 | Unchanged |
| auth_attempts / auth_sessions / auth_users | 8 / 4 / 1 | 8 / 4 / 1 | Every document unchanged |
| Collections / index definitions | 11 / 19 | 11 / 19 | No additions or changes |

All **241 pre-import backup documents** were independently compared with the final live database using native BSON types. Every pre-existing record matches exactly except Pioneer lockVersion/updatedAt; all other fields of that company record also match. This independently confirms the 36 October heads and 36 October versions were untouched, alongside the per-batch fingerprint checks.

No accounting journal, draft, payment application, bank record or customer accounting balance was changed. There are no separate payment/bank-transaction/customer-balance collections in this database inventory; none was introduced. Bank account documents are unchanged and journals remain empty, so these source projections have not created booked AR or revenue. Source invoice values do not establish outstanding customer debt or historical payments.

The final authenticated AR overview confirmed authoritativeEnabled=false and mapping version 2. No financial/accounting write service other than the authorized parallel-projection transaction was called. The final read-only verification caused no further database changes.

## Next-stage readiness and remaining limitations

The historical **parallel** import is accepted with the four explicit review exceptions. There is no unexplained source/import discrepancy. The earlier disposable backup-index validation anomaly remains documented; the ultimately accepted fresh restore passed complete document, option and index verification. The verified backup is the pre-historical-import recovery point, not a post-import backup.

Keep authoritative AR disabled. Next, review F1/F2 source identity and placeholder semantics with the ERP owner, and resolve Q1/Q2 exact unit-price representation with the producer/consumer owners under separate authorization. Do not weaken validation, invent mapping identifiers or force a revenue account for anonymous charges.

Before any authoritative accounting proposal, separately reconcile customer identity, invoice/payment history, opening balances, source-state completeness and the application's existing 2027 cutover rules. Passing pure readiness on 440 invoices is not posting authorization and does not establish their remaining balances. No authoritative drafts or accounting migration are recommended from this historical dataset without that separate reconciliation.

All raw invoice/customer details remain out of this report. Only the protected development backup, this report and the expanded report's current-status pointer were created/updated by this task; application code and configuration were untouched. Existing modified/untracked work was preserved. No production access, ERP modification, payment processing, migration, deployment, commit or running-service restart occurred.

**Stopped after full historical parallel-import reconciliation.**

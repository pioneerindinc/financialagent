# Pioneer AR development backup and mapping proposal — October 12, 2026

Status: **proposal only; no mapping installation or invoice import authorized by this report. Final classification review in section 11 supersedes the initial 39-rule recommendation: 37 supported candidates / 148 lines, two held rules / 10 lines.** Current development storage is the new working baseline. The missing September database is not described as intentionally deleted.

## 1. Verified development backup

Backup started October 12 at 12:41:14 EDT (16:41:14 UTC); verification completed 2026-10-12T16:43:58.869Z.

- Directory: `C:\Dev\financialagent\.local\backups\financialagent-dev\20261012T164114Z`.
- Dump: `dump/financialagent_dev`; evidence: `manifest.json` and `SHA256SUMS.txt`.
- Source: `mongodb://127.0.0.1:27291/financialagent_dev?replicaSet=financialagent-dev&directConnection=true`. Exact environment URI, development flags, controller workspace/database/replica/port, and MongoDB hello identity were verified before backup.
- Tools: MongoDB Database Tools 100.14.0; MongoDB 8.0.12. No application-specific backup command exists. The existing scheduled development backup covers ERP only and was not run.
- A database-scoped mongodump read the running source. Snapshot fingerprints before and after that dump matched. Every BSON document independently matched the source; a complete isolated mongorestore then matched all documents, collection options, and ordered index definitions. Full source comparisons before and after final validation matched.
- Coverage: **11 collections, 126 documents, 19 indexes**, including empty AR/journal/period collections and authentication collections. Replica oplog, server users/roles, environment files, TLS keys and full replica configuration are outside this application-data backup.
- All 23 dump files (22 namespace files plus tool-version prelude) have SHA-256 checksums; the manifest also has a checksum. Backup ACL inheritance was removed and access granted only to the current Windows user, SYSTEM and Administrators. Authentication material remains private inside the backup; it is not included in this report.
- Verification restored only into a newly created loopback MongoDB process under the backup directory, on a different port with TTL cleanup disabled. All disposable validation processes were stopped; their isolated data directories remain inside the protected backup folder. The application and its database were not restarted or restored.
- Tool caveat: mongorestore's server URI must **omit the database path** when using the dump root and `--nsInclude=financialagent_dev.*`. Initial validation attempts restored no namespaces because a database-qualified URI changed directory interpretation; namespace comparison detected this and they were not accepted. Final validation restored and compared all 11 namespaces.
- This is a verified local logical backup, not an off-machine/disaster-recovery copy. Do not delete the checkout's ignored `.local` directory. Any later durable off-machine copy needs an approved development-only destination.

| Namespace | Documents | Indexes |
| --- | --- | --- |
| accounts | 52 | 2 |
| arinvoices | 0 | 2 |
| armappings | 1 | 2 |
| arversions | 0 | 2 |
| audits | 59 | 1 |
| auth_attempts | 6 | 1 |
| auth_sessions | 3 | 1 |
| auth_users | 1 | 1 |
| companies | 4 | 1 |
| journals | 0 | 4 |
| periods | 0 | 2 |

### Repeating the supported procedure later

Verify the exact source URI and authenticated lifecycle controller; capture source document/options/index fingerprints with native-driver reads. Create a new timestamped private directory. Run the installed mongodump against only `financialagent_dev`, with `--numParallelCollections=1`. Reject a backup if before/after source fingerprints differ. Start a separate disposable loopback MongoDB with a new data path and non-application port; never point restoration at port 27291. Restore the dump using a server-only URI, `--nsInclude=financialagent_dev.*` and `--stopOnError`. Compare every namespace, BSON-typed document, option and index against the source; hash all artifacts and stop the disposable process. No running-source restore, model initialization or index creation is part of backup.

## 2. Historical inventory and reconstruction limits

Sources: [historical mapping review](PIONEER_AR_LIVE_MAPPING_REVIEW.md), [historical validation](PIONEER_AR_LIVE_VALIDATION.md), and current `src/domains/ar/{mapping,contract,readiness,service}.ts`. September 15 documentation describes 70 parallel projections and mapping version 2. This proposal reconstructs specifications, not those missing database records.

Exactly **74 historical selectors** were extracted: 67 part-sale exact pairs, four standalone exact pairs, and three classification rules (repair, equipment, shipping). The five repair catalog examples represent one repair classification rule, not five rules. The equipment catalog example does not turn the documented company-wide equipment rule into an item-specific rule.

All 74 selectors are representable by today's strict schema. Their predicate and account-code intent can be reproduced; original mapping record IDs, per-rule reason strings, audit history and historical account UUIDs cannot be recovered from these documents. All account references must be resolved to current company-owned IDs.

**23 historical rules are observed in this window; 51 are not.** No rule is proven obsolete by nonappearance in one date window. Unobserved rules are deferred from the recommended installation batch pending current-source/business review. No historical selector collision or equal-precedence ambiguity was found.

## 3. Current account compatibility and required AR correction

**Current mapping version 1 has no revenue rules and points to 1010 Home - Checking, not 1100 Accounts Receivable.** It passes structural validation because it is an active Asset control account; that does not make it the correct receivable account. The proposed mapping explicitly changes arAccountId to 1100. This requires human approval and is not installed here.

| Code | Current name | Current database ID | Type | Posting eligibility |
| --- | --- | --- | --- | --- |
| 1100 | Accounts Receivable | c90ee95b-fc58-4dbe-a5c8-f6aeaaf879b1 | Asset | passes current validator |
| 4100 | Repair | 415f9677-b9b3-4634-b5a2-61733fc90332 | Revenue | passes current validator |
| 4200 | Parts | aaef4c56-2ddf-4fa4-ab09-e495cf2324e9 | Revenue | passes current validator |
| 4300 | Equipment | 150773a4-4af6-4e5b-ac5e-1221dd0453cb | Revenue | passes current validator |
| 4400 | Shipping | 7b79f117-6dca-4722-953e-194511832836 | Revenue | passes current validator |

1100 is active, company-owned, marked controlAccount=true and manual posting disabled. Current 4100/4200/4300/4400 are active company-owned Revenue targets; no account creation or code substitution is required. 4400 is named “Shipping” today; it is Revenue. 6600 Shipping is Expense and must not be used for invoice shipping income. 4000 is not proposed as a posting target. Some older account documents omit postingAccount; the existing validator accepts these through `$ne: false`, consistent with the model's default. That is an explicit compatibility observation, not a repair made by this task.

The proposed and historical-reconstructed mappings passed the actual mappingSchema and validateMappingAccounts predicates against the verified account snapshot using an in-memory read-only Account adapter. No persistence module or saveMapping was invoked. No target account code is duplicated.

## 4. October ERP window and coverage

Fresh scan at 2026-10-12T16:47:37.439Z: October 1–12 inclusive, contract `pioneer-customer-invoices-v1`, page size 50. Existing scanInvoices and strict response validation retrieved the complete window in 1 page(s): **36 invoices / 158 lines**. The scan was not truncated at 50. Only source selectors and aggregate results appear here; no customer names, invoice numbers, raw responses or credentials are retained in this report.

| Source classification | Lines |
| --- | --- |
| standalone-item | 1 |
| shipping-income | 19 |
| part-sale-item | 58 |
| equipment-sales | 9 |
| repair-revenue | 71 |

| Scenario | Resolved lines | Fully mapped invoices |
| --- | --- | --- |
| Current empty mapping | 0 | 0 |
| All 74 reconstructed historical rules | 137 | 20 |
| Initial 39-rule technical candidate batch (classification review below supersedes) | 158 | 36 |
| All 90 historical + new candidates (not recommended without deferred-rule review) | 158 | 36 |

Historical rules leave **21 lines on 16 invoices** unresolved. These require 16 new exact selectors: 15 part-sale pairs covering 20 lines, plus one standalone P201 pair covering one line. The existing P201 part-sale rule deliberately does not cross sourceType into standalone invoices. No new contract classification, generic unmapped fallback, tax rule, or shipping duplication is needed.

Current contract supports part-sale-invoice, repair-invoice and standalone-invoice with item/shipping lines, six mapping keys, and exact matching on the selectors below. Specific item rules take precedence over classification rules; equal-precedence multiple matches fail closed.

With candidate targets applied **in memory only**, actual resolveLine resolves all 158 lines and readiness reports 0 non-mode issues across 36 invoices. This does not establish accounting authority, invoice payment status, or balances. Parallel mode still prevents drafting/posting; these 2026 invoices are also before the planned 2027 cutover.

## 5. Historical rule inventory

“*” means the selector property is omitted, not a literal wildcard. All populated item references and part IDs below require **both** values to match exactly; sourceType is also exact. H labels identify this report's reconstruction only. Observed rules are proposed for reconfirmation; deferred means not observed, not obsolete.

| Rule | mappingKey | sourceType | itemReference | partId | Target code | October lines | Proposal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H01 | equipment-sales | * | * | * | 4300 | 9 | Reconfirm / include |
| H02 | repair-revenue | * | * | * | 4100 | 71 | Reconfirm / include |
| H03 | shipping-income | * | * | * | 4400 | 19 | Reconfirm / include |
| H04 | part-sale-item | part-sale-invoice | P201 | 69e17d03afacc931bc12ea67 | 4200 | 6 | Reconfirm / include |
| H05 | part-sale-item | part-sale-invoice | P202 | 69e17d03afacc931bc12ea68 | 4200 | 7 | Reconfirm / include |
| H06 | part-sale-item | part-sale-invoice | P203 | 69e17d03afacc931bc12ea69 | 4200 | 1 | Reconfirm / include |
| H07 | part-sale-item | part-sale-invoice | P204 | 69e17d03afacc931bc12ea6a | 4200 | 0 | Defer current review |
| H08 | part-sale-item | part-sale-invoice | P205 | 69e17d03afacc931bc12ea6b | 4200 | 1 | Reconfirm / include |
| H09 | part-sale-item | part-sale-invoice | P207 | 69fb39f545a184dc62946a7d | 4200 | 0 | Defer current review |
| H10 | part-sale-item | part-sale-invoice | P208 | 69e17d03afacc931bc12ea6d | 4200 | 0 | Defer current review |
| H11 | part-sale-item | part-sale-invoice | P209 | 69e17d03afacc931bc12ea6e | 4200 | 0 | Defer current review |
| H12 | part-sale-item | part-sale-invoice | P210 | 69e17d03afacc931bc12ea6f | 4200 | 1 | Reconfirm / include |
| H13 | part-sale-item | part-sale-invoice | P211 | 69e17d03afacc931bc12ea70 | 4200 | 1 | Reconfirm / include |
| H14 | part-sale-item | part-sale-invoice | P214 | 69e17d03afacc931bc12ea73 | 4200 | 2 | Reconfirm / include |
| H15 | part-sale-item | part-sale-invoice | P220 | 69e17d03afacc931bc12ea78 | 4200 | 1 | Reconfirm / include |
| H16 | part-sale-item | part-sale-invoice | P222 | 69e17d03afacc931bc12ea7a | 4200 | 3 | Reconfirm / include |
| H17 | part-sale-item | part-sale-invoice | P228 | 69e17d03afacc931bc12ea80 | 4200 | 0 | Defer current review |
| H18 | part-sale-item | part-sale-invoice | P232 | 69e17d03afacc931bc12ea83 | 4200 | 0 | Defer current review |
| H19 | part-sale-item | part-sale-invoice | P235 | 69e17d03afacc931bc12ea85 | 4200 | 1 | Reconfirm / include |
| H20 | part-sale-item | part-sale-invoice | P241 | 69e17d03afacc931bc12ea88 | 4200 | 1 | Reconfirm / include |
| H21 | part-sale-item | part-sale-invoice | P252 | 69e17d03afacc931bc12ea8a | 4200 | 2 | Reconfirm / include |
| H22 | part-sale-item | part-sale-invoice | P256 | 69e17d03afacc931bc12ea8d | 4200 | 0 | Defer current review |
| H23 | part-sale-item | part-sale-invoice | P260 | 69e17d03afacc931bc12ea91 | 4200 | 0 | Defer current review |
| H24 | part-sale-item | part-sale-invoice | P275 | 69e17d03afacc931bc12ea9d | 4200 | 0 | Defer current review |
| H25 | part-sale-item | part-sale-invoice | P302 | 69e17d03afacc931bc12eab1 | 4200 | 2 | Reconfirm / include |
| H26 | part-sale-item | part-sale-invoice | P304 | 69e17d03afacc931bc12eab3 | 4200 | 1 | Reconfirm / include |
| H27 | part-sale-item | part-sale-invoice | P310 | 69e17d03afacc931bc12eab9 | 4200 | 0 | Defer current review |
| H28 | part-sale-item | part-sale-invoice | P321 | 69e17d03afacc931bc12eac4 | 4200 | 1 | Reconfirm / include |
| H29 | part-sale-item | part-sale-invoice | P322 | 69e17d03afacc931bc12eac5 | 4200 | 0 | Defer current review |
| H30 | part-sale-item | part-sale-invoice | P323 | 69e17d03afacc931bc12eac6 | 4200 | 1 | Reconfirm / include |
| H31 | part-sale-item | part-sale-invoice | P325 | 69e17d03afacc931bc12eac8 | 4200 | 0 | Defer current review |
| H32 | part-sale-item | part-sale-invoice | P326 | 69e17d03afacc931bc12eac9 | 4200 | 0 | Defer current review |
| H33 | part-sale-item | part-sale-invoice | P330 | 69e17d03afacc931bc12eacc | 4200 | 1 | Reconfirm / include |
| H34 | part-sale-item | part-sale-invoice | P345 | 69e17d03afacc931bc12ead7 | 4200 | 1 | Reconfirm / include |
| H35 | part-sale-item | part-sale-invoice | P399 | 69e17d03afacc931bc12eae9 | 4200 | 0 | Defer current review |
| H36 | part-sale-item | part-sale-invoice | P463 | 69e17d03afacc931bc12eb15 | 4200 | 0 | Defer current review |
| H37 | part-sale-item | part-sale-invoice | P513 | 69e17d03afacc931bc12eb2a | 4200 | 0 | Defer current review |
| H38 | part-sale-item | part-sale-invoice | P521 | 69e17d03afacc931bc12eb2f | 4200 | 0 | Defer current review |
| H39 | part-sale-item | part-sale-invoice | P603 | 69e17d03afacc931bc12eb56 | 4200 | 0 | Defer current review |
| H40 | part-sale-item | part-sale-invoice | P605 | 69e17d03afacc931bc12eb58 | 4200 | 0 | Defer current review |
| H41 | part-sale-item | part-sale-invoice | P609 | 69e17d03afacc931bc12eb5c | 4200 | 0 | Defer current review |
| H42 | part-sale-item | part-sale-invoice | P634 | 69e17d03afacc931bc12eb72 | 4200 | 0 | Defer current review |
| H43 | part-sale-item | part-sale-invoice | P643 | 69e17d03afacc931bc12eb7b | 4200 | 0 | Defer current review |
| H44 | part-sale-item | part-sale-invoice | P645 | 69e17d03afacc931bc12eb7d | 4200 | 0 | Defer current review |
| H45 | part-sale-item | part-sale-invoice | P652 | 69e17d03afacc931bc12eb84 | 4200 | 0 | Defer current review |
| H46 | part-sale-item | part-sale-invoice | P654 | 69e17d03afacc931bc12eb86 | 4200 | 0 | Defer current review |
| H47 | part-sale-item | part-sale-invoice | P671 | 69e17d03afacc931bc12eb92 | 4200 | 0 | Defer current review |
| H48 | part-sale-item | part-sale-invoice | P675 | 69e17d03afacc931bc12eb95 | 4200 | 0 | Defer current review |
| H49 | part-sale-item | part-sale-invoice | P682 | 69e17d03afacc931bc12eb9b | 4200 | 0 | Defer current review |
| H50 | part-sale-item | part-sale-invoice | P687 | 69e17d03afacc931bc12eba0 | 4200 | 0 | Defer current review |
| H51 | part-sale-item | part-sale-invoice | P688 | 69e17d03afacc931bc12eba1 | 4200 | 0 | Defer current review |
| H52 | part-sale-item | part-sale-invoice | P689 | 69e17d03afacc931bc12eba2 | 4200 | 0 | Defer current review |
| H53 | part-sale-item | part-sale-invoice | P693 | 69e17d03afacc931bc12eba6 | 4200 | 0 | Defer current review |
| H54 | part-sale-item | part-sale-invoice | P710 | 6a1884d4f83594ef99bac272 | 4200 | 0 | Defer current review |
| H55 | part-sale-item | part-sale-invoice | P711-LN2 | 6a79cf959c847523c1812e26 | 4200 | 0 | Defer current review |
| H56 | part-sale-item | part-sale-invoice | P713 | 6a75e9199c847523c180a6c9 | 4200 | 0 | Defer current review |
| H57 | part-sale-item | part-sale-invoice | P714 | 6a15d111a7ce5b3352f36ea5 | 4200 | 0 | Defer current review |
| H58 | part-sale-item | part-sale-invoice | P715 | 6a2c2c38d4f6f954e205fc0d | 4200 | 0 | Defer current review |
| H59 | part-sale-item | part-sale-invoice | P720 | 6a79cf389c847523c1812d2d | 4200 | 0 | Defer current review |
| H60 | part-sale-item | part-sale-invoice | P729 | 6a7f40f4c724b5ba605f8879 | 4200 | 0 | Defer current review |
| H61 | part-sale-item | part-sale-invoice | P729-90 | 6a7f4152c724b5ba605f8943 | 4200 | 0 | Defer current review |
| H62 | part-sale-item | part-sale-invoice | P751 | 69e17d03afacc931bc12ebbb | 4200 | 3 | Reconfirm / include |
| H63 | part-sale-item | part-sale-invoice | P821 | 69e17d03afacc931bc12ebc8 | 4200 | 0 | Defer current review |
| H64 | part-sale-item | part-sale-invoice | P851 | 69e17d03afacc931bc12ebd2 | 4200 | 0 | Defer current review |
| H65 | part-sale-item | part-sale-invoice | P853 | 69e17d03afacc931bc12ebd4 | 4200 | 0 | Defer current review |
| H66 | part-sale-item | part-sale-invoice | P860 | 69e17d03afacc931bc12ebd5 | 4200 | 1 | Reconfirm / include |
| H67 | part-sale-item | part-sale-invoice | P861 | 69e17d03afacc931bc12ebd6 | 4200 | 0 | Defer current review |
| H68 | part-sale-item | part-sale-invoice | P881 | 69e17d03afacc931bc12ebe0 | 4200 | 0 | Defer current review |
| H69 | part-sale-item | part-sale-invoice | PC101 | 6a17329cab01c63a94fa8811 | 4200 | 0 | Defer current review |
| H70 | part-sale-item | part-sale-invoice | PC102 | 69fde843986fc03193f58767 | 4200 | 0 | Defer current review |
| H71 | standalone-item | standalone-invoice | P728 | 6a79e6419c847523c1816065 | 4200 | 0 | Defer current review |
| H72 | standalone-item | standalone-invoice | P950-V | 6a2ad71cee706d8c5ae2e9dc | 4100 | 0 | Defer current review |
| H73 | standalone-item | standalone-invoice | Repair | 6a03458801186a2594c0c89f | 4100 | 0 | Defer current review |
| H74 | standalone-item | standalone-invoice | T9022 | 6a7c9a3d4fbfa8319802b4ba | 4200 | 0 | Defer current review |

## 6. Initial mapping candidate batch — 39 rules, superseded by section 11

Use arAccountId **c90ee95b-fc58-4dbe-a5c8-f6aeaaf879b1** (1100), subject to explicit approval of the change from 1010. Reconfirm the 23 observed H rules listed above. Add only the following 16 N candidates after account-owner review. Each proposed 4200 destination is a **candidate**, not an inference that every part-numbered source line is necessarily parts revenue. Reviewer must verify the source item's commercial classification, including used parts and the standalone cross-family item.

| Rule | mappingKey | sourceType | itemReference | partId | Candidate code | October lines | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N01 | part-sale-item | part-sale-invoice | P206 | 69e17d03afacc931bc12ea6c | 4200 | 1 | Approval required |
| N02 | part-sale-item | part-sale-invoice | P212 | 69e17d03afacc931bc12ea71 | 4200 | 2 | Approval required |
| N03 | part-sale-item | part-sale-invoice | P216 | 69f8f676d4b7efe64076f895 | 4200 | 4 | Approval required |
| N04 | part-sale-item | part-sale-invoice | P261U | 69e17d03afacc931bc12ea92 | 4200 | 1 | Approval required |
| N05 | part-sale-item | part-sale-invoice | P303 | 69e17d03afacc931bc12eab2 | 4200 | 1 | Approval required |
| N06 | part-sale-item | part-sale-invoice | P305 | 69e17d03afacc931bc12eab4 | 4200 | 2 | Approval required |
| N07 | part-sale-item | part-sale-invoice | P317 | 69e17d03afacc931bc12eac0 | 4200 | 1 | Approval required |
| N08 | part-sale-item | part-sale-invoice | P318 | 69e17d03afacc931bc12eac1 | 4200 | 1 | Approval required |
| N09 | part-sale-item | part-sale-invoice | P332 | 69e17d03afacc931bc12eace | 4200 | 1 | Approval required |
| N10 | part-sale-item | part-sale-invoice | P348 | 69e17d03afacc931bc12ebe8 | 4200 | 1 | Approval required |
| N11 | part-sale-item | part-sale-invoice | P363 | 69e17d03afacc931bc12eae2 | 4200 | 1 | Approval required |
| N12 | part-sale-item | part-sale-invoice | P684 | 69e17d03afacc931bc12eb9d | 4200 | 1 | Approval required |
| N13 | part-sale-item | part-sale-invoice | P719 | 6a0606e9ed526650d38de638 | 4200 | 1 | Approval required |
| N14 | part-sale-item | part-sale-invoice | P798 | 6a0487da37a608a5a0a3982c | 4200 | 1 | Approval required |
| N15 | part-sale-item | part-sale-invoice | P801 | 69e17d03afacc931bc12ebc2 | 4200 | 1 | Approval required |
| N16 | standalone-item | standalone-invoice | P201 | 69e17d03afacc931bc12ea67 | 4200 | 1 | Approval required |

Initial candidate membership (do not install unchanged; see section 11): **H01, H02, H03, H04, H05, H06, H08, H12, H13, H14, H15, H16, H19, H20, H21, H25, H26, H28, H30, H33, H34, H62, H66, N01, N02, N03, N04, N05, N06, N07, N08, N09, N10, N11, N12, N13, N14, N15, N16**. Current account IDs are in section 3. For every selected row construct mappingKey, optional sourceType/itemReference/partId exactly as shown, accountId from that table, and a reviewed nonempty reason (maximum 500 characters). Suggested reason template after approval: “October 2026 baseline reconstruction [rule label]: approved [exact source selector or classification]; target [account code].” Do not represent reconstructed reasons as recovered September reasons.

The alternative 90-rule batch would also classify all current lines, but it includes 51 selectors whose continued applicability was not established. It is not the default proposal.

## 7. Unresolved decisions

1. Approve 1100 as the mapping's AR account, replacing the current 1010 checking selection; no account mutation is needed for that mapping change.
2. Reconfirm the 23 observed historical selectors and their account-code intent. Approve or revise all 16 new exact candidates individually. If any is rejected, recalculate coverage; no fallback is permitted.
3. Review the 51 unobserved historical selectors separately before installing them. No permanent obsolete designation is supported by this scan.
4. Recognize that current account UUIDs are newly resolved bindings. Original historical account UUID equality and original per-rule reasons are unknown. The new version must state reconstruction provenance.
5. The backup is local and includes sensitive authentication collections. A durable independent copy remains a separate operational decision; do not attach the dump to this report or commit it.

## 8. Later controlled installation — separate approval required

1. Obtain explicit approval for the AR account change and the exact rule membership/targets/reasons. This report alone is not authorization.
2. Reverify the pinned development environment, company binding and authoritative=false; re-read accounts and the latest mapping version. Validate backup checksums; take a new verified backup if the baseline materially changed.
3. Re-scan the complete October window and recompute schema, account, duplicate-selector, ambiguity and line coverage checks using the actual mapping functions. Review any changed records or new source pairs before proceeding.
4. Build the complete approved mapping object. Through the existing authenticated same-origin `POST /api/ar` mapping command, use `action: "mapping"`, `companyId: "pioneer-industries"`, `data: { arAccountId, rules }`, `version: <fresh latest version>`, and a reviewed batch reason. Human finance:write and company access are required. The field is **version**, not expectedVersion, in the API payload. No direct Mongo writes.
5. If version 1 is still current, normal saveMapping creates version 2, preserves version 1, adds one ar.mapping audit and increments the company lock once. It does not import invoices or create journals. A stale version fails and must be re-reviewed; do not retry with a guessed version. This new version 2 is not the recovered September version 2.
6. Read back the mapping and verify the approved selectors/targets, AR account, version, audit, and lock behavior. Confirm AR invoice/version/journal counts remain unchanged. Stop for separate parallel-import approval.

## 9. Acceptance gates before the first parallel import

- Verified development-only backup and unchanged expected target; integrity checks pass.
- Approved mapping installed through the normal service, 1100 selected, source selectors exact, accounts valid and company-owned.
- Complete strict ERP scan, no malformed/incomplete pagination, no source identity collisions or existing revision conflicts; do not assume an empty database at the later execution time.
- Zero unresolved/ambiguous lines under the approved plan. Re-review all non-mode readiness issues; zero issues here is time-specific. Full scan must fit 250 invoices / 5,000 lines (today: 36/158).
- Mapping version and company concurrency checks current. Use mode parallel and keep authoritative=false. No automatic drafting, posting, opening AR, balance changes or payment writeback.
- Separately approve the import window and expected new projection/version/audit counts. Never call importScan or syncInvoices as a mapping test.

## 10. Verification and scope

Backup and isolated restoration passed; every namespace/document/options/index comparison and SHA-256 verification passed. Historical extraction yielded 74 selectors; strict schema/account validation passed; actual resolveLine/readiness evaluated the live window without persistence. No application code changed, so TypeScript, build and database-mutating test suites were not run. No dev:verify, migration, production access, source restart, mapping save, invoice import or accounting posting occurred. Only this documentation report and authorized ignored backup/validation artifacts were created. Existing uncommitted source changes were preserved.

## 11. Final read-only accounting classification review — October 12, 2026

**This section supersedes the initial 39-rule installation recommendation and its implication of accounting completeness.** Technical 158/158 matching remains true, but the descriptions support only **37 approved candidates covering 148 lines**. Two rules covering 10 lines need a business decision. “Approved candidate” means supported by this read-only review, **not user authorization to save it**. No rule or account was installed or changed.

### AR account and persisted checking selection

Fresh native-driver reads reverified the exact loopback development URI, authenticated controller and replica identity. Account **1100 Accounts Receivable** (ID `c90ee95b-fc58-4dbe-a5c8-f6aeaaf879b1`) belongs to pioneer-industries, is active, Asset, controlAccount=true and allowManualPosting=false. postingAccount is absent in the stored legacy document: the schema defaults it to true and current validators accept `postingAccount != false`. Therefore 1100 is eligible and meets current control-account safeguards; it is **not yet the account selected by the persisted AR mapping**. No opening balance, posting authorization or independent subledger reconciliation is implied.

Current mapping version 1 explicitly persists account **1010 Home - Checking** (ID `caa23345-707d-4fb6-958e-2eac9dc519df`). Its ar.mapping audit was written October 12 at **10:53:53 EDT** with reason **“test”**, human attribution, no previous mapping, and matching after.arAccountId. The persisted selection is confirmed; the operator's motivation is not recorded beyond that reason. It is not a UI default: `ar-console.tsx` uses the stored arAccountId or an empty “Select account” option. The form filters active Asset/control/posting accounts, so 1010 appears because it is also marked controlAccount=true. Neither that filter nor validateMappingAccounts distinguishes a bank account from receivables by business purpose. 1010 additionally allows manual posting. Reject retaining 1010 as the AR destination.

Safeguards checked in current code: mapping company ownership, active Asset/control/posting eligibility; finance:write plus company/binding access and expected mapping version on save; company serialization/audit; accounting accountsValid rejects manual use of 1100 at draft/edit/post, while governed service-origin source drafts can use it. AR posting also requires enabled authoritative mode, current source/mapping versions, an eligible authoritative draft and the 2027 cutover. Current authoritative=false and parallel-mode restrictions remain. The AR validator does not independently require allowManualPosting=false, so 1100's persisted restriction was verified explicitly. No safeguard guarantees the business correctness of a selected account.

### Per-rule review — all 39 proposed rules

Fresh strict v1 scan again returned 36 invoices / 158 lines. Actual descriptions were reviewed in memory with sourceType, mappingKey, itemReference and partId; customer names, invoice numbers, unit serials and raw payloads are not retained here. Exact selector identities remain in sections 5–6. All 20 observed historical part pairs match the documented IDs/references and component descriptions; all 16 new pairs were inspected, not accepted merely because they matched a rule.

| Rule | Matching item/service (actual ERP evidence summarized) | Proposed account | Lines | Status |
| --- | --- | --- | --- | --- |
| H01 | P111 (5) / P112 (4): equipment-classified, unit/serial-only descriptions | 4300 Equipment | 9 | needs business decision |
| H02 | NRP285 (40), LRS190 (12), Repair (15); Revac / Liquid Test (4, including 2 zero-value warranty lines) | 4100 Repair | 71 | approved candidate |
| H03 | Explicit Shipping lines: part-sale 14, repair 4, standalone 1 | 4400 Shipping | 19 | approved candidate |
| H04 | P201: Side A cover, Puritan Bennett C-1000 | 4200 Parts | 6 | approved candidate |
| H05 | P202: Side B cover, Puritan Bennett C-1000 | 4200 Parts | 7 | approved candidate |
| H06 | P203: Strap, Puritan Bennett C-1000 | 4200 Parts | 1 | approved candidate |
| H08 | P205: Warning decal | 4200 Parts | 1 | approved candidate |
| H12 | P210: 1/4-inch brass nut | 4200 Parts | 1 | approved candidate |
| H13 | P211: 1/4-inch brass ferrule | 4200 Parts | 1 | approved candidate |
| H14 | P214: Primary relief valve, 22 PSI | 4200 Parts | 2 | approved candidate |
| H15 | P220: Fill-tube tubing | 4200 Parts | 1 | approved candidate |
| H16 | P222: Companion T decal | 4200 Parts | 3 | approved candidate |
| H19 | P235: Weight-scale lens | 4200 Parts | 1 | approved candidate |
| H20 | P241: Quick-connect bottom assembly / Teflon seal | 4200 Parts | 1 | approved candidate |
| H21 | P252: Vent lever | 4200 Parts | 2 | approved candidate |
| H25 | P302: Bezel decal | 4200 Parts | 2 | approved candidate |
| H26 | P304: Shroud decal | 4200 Parts | 1 | approved candidate |
| H28 | P321: Contents gauge, 41A | 4200 Parts | 1 | approved candidate |
| H30 | P323: Contents gauge, 21A | 4200 Parts | 1 | approved candidate |
| H33 | P330: Bezel | 4200 Parts | 1 | approved candidate |
| H34 | P345: Drain-tube rubber elbow | 4200 Parts | 1 | approved candidate |
| H62 | P751: Metal lip seal | 4200 Parts | 3 | approved candidate |
| H66 | P860: Grey knob | 4200 Parts | 1 | approved candidate |
| N01 | P206: Rubber foot | 4200 Parts | 1 | approved candidate |
| N02 | P212: Aluminum relief-valve adapter | 4200 Parts | 2 | approved candidate |
| N03 | P216: Female quick-connect assembly | 4200 Parts | 4 | approved candidate |
| N04 | P261U: Bottle (USED), Puritan Bennett C-1000; component versus complete unit not established | 4200 Parts | 1 | needs business decision |
| N05 | P303: Window decal | 4200 Parts | 1 | approved candidate |
| N06 | P305: Primary relief valve, 22 PSI | 4200 Parts | 2 | approved candidate |
| N07 | P317: Bottle bracket | 4200 Parts | 1 | approved candidate |
| N08 | P318: Relief economizer valve | 4200 Parts | 1 | approved candidate |
| N09 | P332: Bezel screw | 4200 Parts | 1 | approved candidate |
| N10 | P348: Drain bottle kit | 4200 Parts | 1 | approved candidate |
| N11 | P363: Quick-release long pin | 4200 Parts | 1 | approved candidate |
| N12 | P684: Feed-through harness assembly | 4200 Parts | 1 | approved candidate |
| N13 | P719: Transfer-line flare adapter | 4200 Parts | 1 | approved candidate |
| N14 | P798: In-line swivel assembly | 4200 Parts | 1 | approved candidate |
| N15 | P801: Flow-control valve, 1/4–6 LPM, 22 PSI | 4200 Parts | 1 | approved candidate |
| N16 | P201 standalone side cover; same part ID as historical part-sale P201 | 4200 Parts | 1 | approved candidate |

No original rule is conclusively rejected based on source evidence: H01 and N04 are held because their proposed accounts are plausible but not established. Rejected approaches are retaining checking as AR, routing freight to Parts/Repair, using Expense 6600 for freight revenue, and installing all 39 unchanged while describing them as fully accounting-reviewed.

### Accounting meaning and limits

- **Repair labor/service:** NRP285 (40), LRS190 (12) and Repair (15) are source-classified repair-revenue and were covered by the approved September repair rule. Current unit descriptions are mostly serial/context evidence; they do not prove the underlying labor/parts cost split. 4100 Repair is supported for the billed service classification, not for inferring inventory cost, completion or a separate labor margin.
- **Revac:** P975 (warranty, zero) and P975-V (charged) are described as Revac services on repair invoices. 4100 Repair is consistent with the existing repair-service rule. The technical procedure behind “revac” was not independently verified and no vacuum/material cost split is inferred.
- **Liquid:** P900 (warranty, zero) and P900-V (charged) explicitly say **Liquid Test**. Treat these as testing services under 4100, not sales of liquid inventory. No separately described bulk-liquid/gas sale was observed. A future liquid commodity sale needs its own business classification. Zero warranty lines remain zero; a mapping does not manufacture revenue.
- **Parts:** covers, seals, gauges, valves, fittings, tubing, decals, brackets, a harness, a drain bottle kit and similar identified components support 4200 Parts. A drain bottle kit (P348) and bottle bracket (P317) are component/accessory descriptions, not evidence of complete equipment resale. Most descriptions do not establish new-versus-used condition; do not label every ordinary part “new.” Separate new/used accounts are not required by the current chart, but a desired management split would be a separate decision.
- **Used/replacement bottle:** P261U explicitly says Bottle (USED). Its exact pair is `part-sale-invoice / part-sale-item / P261U / 69e17d03afacc931bc12ea92`. Confirm whether this is a replacement component sold as a part (4200), a complete owned unit/equipment sale (4300), or an exchange/deposit/other arrangement needing different treatment. The description and part-sale source family alone do not decide this. One line is held.
- **Equipment:** P111 (5 lines) and P112 (4) carry equipment-sales but offer serial-only unit descriptions. H01 historically covered the classification with a P110 example; that does not establish the commercial meaning of P111/P112. Confirm a sale of equipment with ownership transferred rather than rental, exchange/deposit, loaner or service. If confirmed, existing 4300 is appropriate; otherwise hold and design the appropriate exact treatment. Nine lines are held.
- **Freight:** all **19 explicit Shipping lines** carry shipping-income and should map to existing **4400 Shipping, Revenue**, active and explicitly postingAccount=true. A dedicated freight-income account is necessary for this plan and **already exists**; no additional account is needed. Do not use 4200, 4100 or Expense 6600. Header shipping is already emitted as these lines and must not be added again. No additional description-labeled freight line hidden under Parts/Repair was observed; this cannot prove no freight was bundled into negotiated prices.
- **Discounts/tax/credits:** no negative lines, explicit discount lines or non-null discount headers were observed. All discount headers are null, which is **unknown/unrepresented, not proven zero**. The current readiness logic rejects non-null tax/discount evidence and negative amounts; do not force a future discount into positive revenue mapping. Dedicated contra-revenue/source-contract support would require separate review if discounts arise. Current 4400 is Shipping Revenue, never a discount account.

The older `PIONEER_INITIAL_ACCOUNTING_SETUP.md` includes different proposed account-code meanings (including freight at 4300 and discounts at 4400); its header explicitly marks that proposal superseded. Current database accounts and the later approved historical mapping reports govern this review. No conflicting old proposal was applied.

### Selector conflicts, account types and coverage

All 39 selectors are unique. The 20 historical and 16 new exact-item selectors match both reference and part ID, with explicit sourceType. The standalone P201 candidate N16 does not overlap part-sale P201 H04 because sourceType differs. No equal-precedence overlaps were found in the live window. Classification-only H01/H02/H03 have different mapping keys and do not overlap the part rules; they remain broader than specific current item references, so new references within these keys need monitoring and semantic review.

All proposed credit accounts 4100/4200/4300/4400 are active company-owned Revenue accounts and pass current posting checks. The incorrect current AR choice is a **business-purpose error**, not an invalid Asset type. 1100 corrects that selection without changing the chart. No existing account is silently retyped or repurposed.

**Current accounts can accommodate all 158 lines if the P111/P112 equipment sale and P261U component/ownership decisions confirm the proposed treatment. That correctness is not yet established.** No mandatory chart change has been demonstrated for this window; freight is already separated. A deposit, rental, commodity sale or separate discount policy could require a different existing account or a separately approved new account and possibly source-contract changes.

### Smallest safe installation recommendation

Do not install the initial 39-rule batch unchanged. Subject to separate user approval and an explicit switch to 1100, the smallest complete set of currently supported proposed selectors is **37 rules / 148 lines**: all original candidates **except H01 and N04**. Preserve the 51 deferred historical rules as uninstalled specifications. Do not broaden selectors to make the remaining 10 lines pass.

This 37-rule subset comprises **22 observed historical rules / 128 lines** (H02, H03 and 20 exact part rules), plus **15 newly reviewed exact rules / 20 lines** (N01–N16 except N04). The new rules are supported by actual component descriptions, with N16 additionally sharing the historical P201 part identity across a different source family; they are not recovered historical approvals. A historical-only first batch could contain the 22 rules, but would resolve only 128 lines and is not a complete October mapping.

If equipment sale classification is confirmed, H01 may be accepted with explicit approval of its classification-wide scope; an alternative is two narrower rules restricted to repair-invoice + equipment-sales + itemReference P111/P112, producing 40 rather than 39 total rules if every other candidate is approved. Such narrower rules would replace H01, not accompany a catch-all intended to classify unreviewed references. If P261U is confirmed as a component, retain N04 -> 4200; if confirmed as equipment sold, change only that exact rule's target to 4300. Any deposit/exchange alternative remains blocked pending a reviewed design.

### Decisions required before installation

1. Approve changing the persisted AR mapping from 1010 to 1100.
2. Confirm the commercial meaning of P111/P112 and whether a classification-wide equipment rule or two exact-reference rules is desired.
3. Confirm P261U is a used replacement component versus a complete unit/exchange/deposit, and choose its account accordingly.
4. Explicitly approve the new 15 component candidates, or the final amended membership after those decisions. No assumption of separate new/used revenue reporting is embedded.

If a partial 37-rule mapping is approved first, its 10 unresolved lines must remain visibly unresolved and full-window import acceptance stays blocked under this plan until resolved. No parallel invoice import or posting is authorized by this classification review. Only this proposal document was updated; database reads, strict ERP GETs and in-memory analysis caused no application-record writes.

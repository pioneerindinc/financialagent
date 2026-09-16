# Pioneer AR approved development mappings — 09-15-2026

The approved revenue rules are now applied in development. Mapping version **2** contains **74 active rules**; historical version 1 is preserved. This is still 2026 parallel/non-authoritative validation, not accounting acceptance. QuickBooks remains official through 12-31-2026.

## Applied configuration

Exact target: 127.0.0.1:27291 / financialagent_dev / replica set financialagent-dev; company pioneer-industries. Authoritative mode remains false.

Created only **4400 Shipping Revenue**, type Revenue, parent = actual database ID of **4000 Revenue**, active=true, postingAccount=true, controlAccount=false, allowManualPosting=true. Existing 4000 remains nonposting and 6600 Shipping remains Expense. AR 1100 remains active/posting/control with manual posting disabled. Existing account documents were preserved.

| Semantic key | Rules | Target | Scope |
| --- | ---: | --- | --- |
| equipment-sales | 1 | 4300 Equipment | Existing company-wide rule preserved verbatim |
| repair-revenue | 1 | 4100 Repair | New company-wide semantic rule |
| shipping-income | 1 | 4400 Shipping Revenue | New company-wide semantic rule; never 6600 |
| part-sale-item | 67 | 4200 Parts | Exact itemReference AND partId, restricted to part-sale-invoice |
| standalone-item | 4 | See below | Exact itemReference AND partId, restricted to standalone-invoice |
| unmapped | 0 | None | No fallback |

All 67 part-sale catalog rows had High review confidence and the explicit 4200 Parts candidate. Each exact reference/part-ID pair was checked against retained source evidence before application. None was guessed or left unresolved. A changed reference or part ID will fail to match rather than silently broaden coverage.

| Standalone reference | Exact part ID | Target |
| --- | --- | --- |
| Repair | 6a03458801186a2594c0c89f | 4100 Repair |
| P950-V | 6a2ad71cee706d8c5ae2e9dc | 4100 Repair |
| T9022 | 6a7c9a3d4fbfa8319802b4ba | 4200 Parts |
| P728 | 6a79e6419c847523c1816065 | 4200 Parts |

All four labels/IDs matched the reviewed catalog. No standalone item was left unresolved. No generic part-sale or standalone rule exists.

## Audit and version behavior

The existing account.create service created 4400 and its normal audit (reason Shipping Revenue, as the service derives account-creation reasons from the account name). The existing saveMapping service then saved the approved rules together as one revision-checked version using expectedVersion=1.

- Mapping records: **1 -> 2** (immutable configuration snapshots, not individual rules).
- Current version: **1 -> 2**.
- Active rules: **1 -> 74**, comprising 73 new rules and the unchanged equipment rule.
- Audits: **124 -> 126**: one account.create, one ar.mapping.
- Rule reasons include the approved repair, shipping and part-sale reason text, with explicit standalone-reference reasons.
- The mapping audit retains the complete before/after configuration and the batch reason: Approved Pioneer AR revenue mappings: repair, shipping, 67 exact part-sale items, and four exact standalone items; existing equipment rule preserved.

## Current projection readiness

All **70 invoices / 456 lines** now resolve to approved revenue accounts: 279 repair-revenue lines, 126 part-sale-item, 10 standalone-item, 40 shipping-income, and the existing equipment-sales line.

| Measure | Count |
| --- | ---: |
| Fully revenue-mapped invoices | 70 |
| Partially mapped invoices | 0 |
| Unmapped invoices | 0 |
| Source-data-blocked invoices, overlapping fully mapped | 2 |
| Invoices without non-mode readiness blockers | 68 |

Mapping readiness is computed from the current rules. Stored source versions and historical import status were not rewritten. All invoices remain parallel and ineligible for accounting drafts; 68 without source blockers does not mean 68 accounting-ready invoices.

## Remaining source-data issues

The two repair invoices below remain blocked by Missing customer identity, missing-customer-identity, and missing-customer-record:

- e1702486ccfecac56a762c1a334af82bd1eacb02ce92a130d3357300aaf30b87
- ef5a783b8a7b7315575c7993b05dac3c0d46c21a0b85653c57bab91a843d2f7b

No customer identity was invented. All 70 missing due-date/terms flags remain. Legacy source identity, positional line identity, and current-source-amount caveats remain on all 70. The 52 historical revenue-classification-review source flags remain as original evidence even though the exact approved mappings now satisfy classification readiness. Null tax/discount evidence remains unsupported/unknown.

Next step: separately scoped **ERP source-data cleanup** for the two customer linkages, followed by replay/review of any legitimate source revisions. Investigate due dates/terms before future aging/Collections design. No ERP or Managers/Data Quality changes were made here.

## Validation

The 08-01-2026 through 09-15-2026 replay returned HTTP 200 on two pages, with 70 unchanged records: imported=0, replayed=70. Projection heads, source payloads, amounts, flags, revisions and versions were compared unchanged. Journals stayed at 1; projection heads/versions stayed at 70/70. All prior accounts and periods were preserved.

112 relevant AR/accounting tests passed on disposable fixtures. Actual local browser review passed across all 70 rows, including all four revenue target labels, standalone target checks, two missing-customer blockers, quality flags and revision history. No draft actions, journal links, or payment/remaining assertions appeared; authoritative mode remained disabled.

No application code changed. Unrelated whitespace still fails git diff --check at .env.example:9 and src/components/finance-console.tsx:1028; those files were left untouched. Typecheck/lint/build were not required for this data/documentation-only task.

See [validation details](PIONEER_AR_LIVE_VALIDATION.md). No production access, ERP changes, deployment, commit or push.

## Applied reference catalog

The following catalog preserves the prior privacy-conscious descriptions and counts, with current mapping status. References are scoped as above; serials/customer names are omitted.

| Key | Item reference | Stable part ID | Representative description | Lines / invoices | Current mapping | Suggested target | Confidence | Human review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| equipment-sales | P110 | — | Equipment serial reference (omitted for privacy) | 1 / 1 | Mapped, version 2 | 4300 Equipment (existing) | High | Approved/applied |
| part-sale-item | P201 | 69e17d03afacc931bc12ea67 | Side Cover..Side A..Puritan Bennett C-1000 | 5 / 5 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P202 | 69e17d03afacc931bc12ea68 | Side Cover..Side B..Puritan Bennett C-1000 | 7 / 7 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P203 | 69e17d03afacc931bc12ea69 | Strap..Puritan Bennett C-1000 | 6 / 6 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P204 | 69e17d03afacc931bc12ea6a | Decal..Keep Upright..Puritan Bennett C-1000 | 4 / 4 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P205 | 69e17d03afacc931bc12ea6b | Decal..Warning..Puritan Bennett C-1000 | 4 / 4 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P207 | 69fb39f545a184dc62946a7d | Rubber Foot..Sheet of 56 | 3 / 3 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P208 | 69e17d03afacc931bc12ea6d | Brass Nut..3/16" | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P209 | 69e17d03afacc931bc12ea6e | Brass Ferrule..3/16" | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P210 | 69e17d03afacc931bc12ea6f | Brass Nut..1/4" | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P211 | 69e17d03afacc931bc12ea70 | Brass Ferrule..1/4" | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P214 | 69e17d03afacc931bc12ea73 | Relief Valve..Primary 22 PSI..Puritan Bennett C-1000 | 4 / 4 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P220 | 69e17d03afacc931bc12ea78 | Tubing..Fill Tube..Puritan Bennett C-1000 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P222 | 69e17d03afacc931bc12ea7a | Decal..Companion T | 3 / 3 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P228 | 69e17d03afacc931bc12ea80 | Nomex Pad..Puritan Bennett C-1000 | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P232 | 69e17d03afacc931bc12ea83 | Bezel..Puritan Bennett C-1000 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P235 | 69e17d03afacc931bc12ea85 | Lens..Weight Scale..Puritan Bennett C-1000 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P241 | 69e17d03afacc931bc12ea88 | Quick Connect..Bottom Only..Includes Teflon Seal..Puritan Bennett C-1000..Helios H850 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P252 | 69e17d03afacc931bc12ea8a | Vent Lever..Puritan Bennett C-1000 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P256 | 69e17d03afacc931bc12ea8d | Caster..Single..60 MM or 3" | 3 / 3 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P260 | 69e17d03afacc931bc12ea91 | Pin..Vent Lever..Puritan Bennett C-1000 | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P275 | 69e17d03afacc931bc12ea9d | Contents Indicator Assembly..Includes Clear Lens, Body, Decal, Needle, Helix..Puritan Bennett C-1000/Companion T | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P302 | 69e17d03afacc931bc12eab1 | Decal..Bezel..Puritan Bennett 41/31/21 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P304 | 69e17d03afacc931bc12eab3 | Decal..Shroud..Puritan Bennett 41/31/21 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P310 | 69e17d03afacc931bc12eab9 | Vent Key Wrench..Puritan Bennett | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P321 | 69e17d03afacc931bc12eac4 | Contents Gauge..Puritan Bennett 41A | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P322 | 69e17d03afacc931bc12eac5 | Contents Gauge..Puritan Bennett 31A | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P323 | 69e17d03afacc931bc12eac6 | Contents Gauge..Puritan Bennett 21A | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P325 | 69e17d03afacc931bc12eac8 | Contents Gauge Bottom | 3 / 3 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P326 | 69e17d03afacc931bc12eac9 | Contents Gauge Top | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P330 | 69e17d03afacc931bc12eacc | Bezel..Puritan Bennett 41/31/21 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P345 | 69e17d03afacc931bc12ead7 | Rubber Elbow..Drain Tube..Puritan Bennett 41/31/21 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P399 | 69e17d03afacc931bc12eae9 | Gauge Nipple..White Teflon | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P463 | 69e17d03afacc931bc12eb15 | Valve Conserver Assembly..Helios H850 | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P513 | 69e17d03afacc931bc12eb2a | Decal..Oxygen Outlet..Helios Stationary | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P521 | 69e17d03afacc931bc12eb2f | Contents Gauge..Helios Stationary | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P603 | 69e17d03afacc931bc12eb56 | Decal..Bottom Decal..Caire | 4 / 4 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P605 | 69e17d03afacc931bc12eb58 | Decal..Stroller..Caire | 3 / 3 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P609 | 69e17d03afacc931bc12eb5c | Shroud..Caire Liberator | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P634 | 69e17d03afacc931bc12eb72 | Meter..Caire | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P643 | 69e17d03afacc931bc12eb7b | Tubing..Primary..Caire Stroller | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P645 | 69e17d03afacc931bc12eb7d | Decal..Hi Flow..Caire | 3 / 3 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P652 | 69e17d03afacc931bc12eb84 | Coil Assembly..Caire Stroller..Bottom Inlet | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P654 | 69e17d03afacc931bc12eb86 | Sleeve..Quick Release..Caire Liberator | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P671 | 69e17d03afacc931bc12eb92 | Vent Key Wrench..Caire Liberator | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P675 | 69e17d03afacc931bc12eb95 | Nomex Pad..Caire Stroller | 3 / 3 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P682 | 69e17d03afacc931bc12eb9b | Plug..Plastic..Caire Stroller | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P687 | 69e17d03afacc931bc12eba0 | Side Cover..Wide..Caire Stroller | 4 / 4 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P688 | 69e17d03afacc931bc12eba1 | Blue Dome..With Opening..Caire Stroller | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P689 | 69e17d03afacc931bc12eba2 | Black Leather Case..Top Fill | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P693 | 69e17d03afacc931bc12eba6 | Top Cover..Wide..Caire Stroller | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P710 | 6a1884d4f83594ef99bac272 | Transfer Line Oxygen 6 Foot 1/2" With Full Armor Brass Nuts | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P711-LN2 | 6a79cf959c847523c1812e26 | Transfer Line Nitrogen 8 Foot..1/2" With Full Armor Brass Nuts | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P713 | 6a75e9199c847523c180a6c9 | Transfer Line..Oxygen..12 Foot..1/2" With Full Armor..Brass Nuts | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P714 | 6a15d111a7ce5b3352f36ea5 | Fill Head..Dual..Puritan Bennett and Caire | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P715 | 6a2c2c38d4f6f954e205fc0d | Fill Head Puritan Bennett | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P720 | 6a79cf389c847523c1812d2d | Source Adapter | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P729 | 6a7f40f4c724b5ba605f8879 | Adapter 5/8" Male Flare X 3/4" Male NPT | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P729-90 | 6a7f4152c724b5ba605f8943 | Adapter 5/8" Male Flare X 3/4" Male NPT 90 Degree Elbow | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P751 | 69e17d03afacc931bc12ebbb | Lip Seal..Metal | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P821 | 69e17d03afacc931bc12ebc8 | FCV - Side Inlet..0-15 LPM..16 Position..Caire Liberator | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P851 | 69e17d03afacc931bc12ebd2 | Dial..1/4-6..Puritan Bennett | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P853 | 69e17d03afacc931bc12ebd4 | FCV..0 - 15 LPM..22 PSI..Puritan Bennett Companion T | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P860 | 69e17d03afacc931bc12ebd5 | Knob..Grey..Puritan Bennett | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P861 | 69e17d03afacc931bc12ebd6 | Locking Plate..Grey..Puritan Bennett | 2 / 2 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | P881 | 69e17d03afacc931bc12ebe0 | Locking Plate..Caire - Black..12 Position | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | PC101 | 6a17329cab01c63a94fa8811 | Decal Perfecto2 Black Shield | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| part-sale-item | PC102 | 69fde843986fc03193f58767 | Decal Perfecto2 V Blue Shield | 1 / 1 | Mapped, version 2 | 4200 Parts; exact item rule | High | Approved/applied |
| repair-revenue | LRCP230 | — | Equipment serial reference (omitted for privacy) | 75 / 4 | Mapped, version 2 | 4100 Repair | High | Approved/applied |
| repair-revenue | LRP190 | — | Equipment serial reference (omitted for privacy) | 105 / 5 | Mapped, version 2 | 4100 Repair | High | Approved/applied |
| repair-revenue | LRS190 | — | Equipment serial reference (omitted for privacy) | 35 / 4 | Mapped, version 2 | 4100 Repair | High | Approved/applied |
| repair-revenue | NRP285 | — | Equipment serial reference (omitted for privacy) | 42 / 1 | Mapped, version 2 | 4100 Repair | High | Approved/applied |
| repair-revenue | Repair | — | Equipment serial reference (omitted for privacy) | 22 / 6 | Mapped, version 2 | 4100 Repair | High | Approved/applied |
| shipping-income | — | — | Shipping | 40 / 40 | Mapped, version 2 | 4400 Shipping Revenue | Review | Approved/applied |
| standalone-item | P728 | 6a79e6419c847523c1816065 | Pressure Gauge 2.5" 400 PSI 1/4" Bottom Inlet | 1 / 1 | Mapped, version 2 | 4200 Parts | Review | Approved/applied |
| standalone-item | P950-V | 6a2ad71cee706d8c5ae2e9dc | Labor and Supplies | 3 / 3 | Mapped, version 2 | 4100 Repair | Review | Approved/applied |
| standalone-item | Repair | 6a03458801186a2594c0c89f | Serial-only / sparse repair description | 5 / 5 | Mapped, version 2 | 4100 Repair | Review | Approved/applied |
| standalone-item | T9022 | 6a7c9a3d4fbfa8319802b4ba | Cryogenic Economizer 300 PSI Combination Pressure Builder/Economizer 1/4" FNPT X 3 | 1 / 1 | Mapped, version 2 | 4200 Parts | Review | Approved/applied |

**READY FOR NEXT AR PHASE** — source-data cleanup/design only.

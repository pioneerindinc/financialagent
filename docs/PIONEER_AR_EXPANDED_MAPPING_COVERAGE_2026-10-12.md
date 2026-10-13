# Expanded Pioneer ERP mapping coverage — October 12, 2026

**Current status: the full historical development parallel import is accepted: 444 review-only projections / 3,368 lines / $851,377.77. Mapping version 2 retains 169 rules; four source exceptions remain flagged and journals remain zero. See [the historical acceptance report](PIONEER_AR_HISTORICAL_PARALLEL_IMPORT_2026-10-12.md). Earlier statements below describe their respective investigation, installation and October-import stages.**

Read-only assessment: **October 13, 2025 through October 12, 2026**, inclusive UTC invoice dates. Compared the exact requested 39 selectors from [the baseline proposal](PIONEER_AR_CURRENT_BASELINE_MAPPING_PROPOSAL.md), including H01 -> 4300 and N04 -> 4200. Nothing was installed; technical matching does not automatically approve additional business classifications.

## Summary and completeness

Assessment ran 2026-10-12T18:21:17.607Z through 2026-10-12T18:21:18.521Z. 17 authenticated GET requests; 13 complete successful windows; 0 failed attempts; 0 remaining date gaps. **444 unique verified invoices / 3368 lines / $851,377.77 source invoice value.** Every requested date is covered by a complete successful scan.

Existing scanInvoices and strict pioneer-customer-invoices-v1 validation were reused unchanged: 50-record pages, complete cursor traversal, stable scan revision and totals, duplicate/date validation, 250-invoice and 5,000-line bounds, 2 MiB response limit and existing timeouts/retries. No scans failed or required subdivision: every monthly window fit the existing bounds. No source bound or database guard was bypassed.

Cross-window identity/revision exceptions excluded: 0. Undated unique records: 0; identical repeated undated observations deduplicated: 0. Undated records are separate from monthly counts. The source provides snapshots per request, not one year-wide point-in-time snapshot; rerun affected windows before installation/import. No Financial Agent database connection, login/session creation, model initialization or persistence function was used.

## Monthly verified source totals

| Included dates | Coverage | Invoices | Lines | Known source USD | Matched lines | Unmatched lines |
| --- | --- | --- | --- | --- | --- | --- |
| 2025-10-13 to 2025-10-31 | complete | 0 | 0 | $0.00 | 0 | 0 |
| 2025-11-01 to 2025-11-30 | complete | 0 | 0 | $0.00 | 0 | 0 |
| 2025-12-01 to 2025-12-31 | complete | 0 | 0 | $0.00 | 0 | 0 |
| 2026-01-01 to 2026-01-31 | complete | 0 | 0 | $0.00 | 0 | 0 |
| 2026-02-01 to 2026-02-28 | complete | 2 | 37 | $7,030.00 | 37 | 0 |
| 2026-03-01 to 2026-03-31 | complete | 13 | 217 | $43,028.13 | 217 | 0 |
| 2026-04-01 to 2026-04-30 | complete | 19 | 364 | $71,710.95 | 364 | 0 |
| 2026-05-01 to 2026-05-31 | complete | 43 | 406 | $93,866.92 | 376 | 30 |
| 2026-06-01 to 2026-06-30 | complete | 84 | 447 | $128,355.91 | 360 | 87 |
| 2026-07-01 to 2026-07-31 | complete | 93 | 705 | $201,284.03 | 596 | 109 |
| 2026-08-01 to 2026-08-31 | complete | 81 | 496 | $121,343.82 | 390 | 106 |
| 2026-09-01 to 2026-09-30 | complete | 73 | 538 | $141,256.69 | 461 | 77 |
| 2026-10-01 to 2026-10-12 | complete | 36 | 158 | $43,501.32 | 158 | 0 |

## 39-rule coverage

| Classification | Lines | Known signed line USD |
| --- | --- | --- |
| Matched | 2959 | $651,232.80 |
| Unmatched | 409 | $200,144.97 |
| Ambiguous | 0 | $0.00 |
| Additional coverage from deferred historical rules | 263 | $124,496.67 |

241/444 invoices are fully technically matched. The 39-rule baseline covers 87.86% of lines and 76.49% of known source value. 0 known header/line-sum discrepancies; 93 zero-value lines; 0 negative lines; 0 unknown line amounts. Dollar coverage sums line amounts once; header freight is not added again. Null amounts are not known zero. Source amounts are neither posted AR nor remaining balances.

Distinct sourceType + mappingKey + itemReference + partId identities: **183**. Distinct displayed nonempty item/service references: **173**. A reference can have multiple families/part IDs. Descriptions were examined in memory; product text is retained only where non-identifying, while unit serials and free text are summarized or withheld.

## Unmatched business categories

| Category | Distinct tuples | Lines | Known signed USD |
| --- | --- | --- | --- |
| Components / parts | 115 | 357 | $120,087.98 |
| Bottle: component versus unit | 3 | 7 | $1,454.05 |
| Used components | 1 | 1 | $900.00 |
| Freight income | 2 | 4 | $2,854.70 |
| Standalone exact-item review | 10 | 40 | $74,848.24 |

## Unmatched item/service list

| Source type / key | Reference | Part ID | Description summary | Lines / invoices | Known USD | Deferred historical rule |
| --- | --- | --- | --- | --- | --- | --- |
| part-sale-invoice / part-sale-item | P197 | 69e17d03afacc931bc12ea64 | Screw..6-32 X 7/8" SS..Puritan Bennett C-1000 | 1 / 1 | $107.00 | None; new review |
| part-sale-invoice / part-sale-item | P198 | 69e17d03afacc931bc12ea65 | Screw..6-32 X 1 1/4" SS..Puritan Bennett C-1000 | 2 / 2 | $107.00 | None; new review |
| part-sale-invoice / part-sale-item | P199 | 69e17d03afacc931bc12ea66 | Screw..6-32 X 2 SS..Puritan Bennett C-1000 | 1 / 1 | $100.50 | None; new review |
| part-sale-invoice / part-sale-item | P204 | 69e17d03afacc931bc12ea6a | Decal..Keep Upright..Puritan Bennett C-1000 | 18 / 18 | $2,261.88 | H07 |
| part-sale-invoice / part-sale-item | P207 | 69fb39f545a184dc62946a7d | Rubber Foot..Sheet of 56 | 11 / 11 | $818.55 | H09 |
| part-sale-invoice / part-sale-item | P208 | 69e17d03afacc931bc12ea6d | Brass Nut..3/16" | 4 / 4 | $269.28 | H10 |
| part-sale-invoice / part-sale-item | P209 | 69e17d03afacc931bc12ea6e | Brass Ferrule..3/16" | 5 / 5 | $332.76 | H11 |
| part-sale-invoice / part-sale-item | P215 | 69e17d03afacc931bc12ea74 | Relief Valve..Secondary 30 PSI..Puritan Bennett C-1000 | 2 / 2 | $794.70 | None; new review |
| part-sale-invoice / part-sale-item | P228 | 69e17d03afacc931bc12ea80 | Nomex Pad..Puritan Bennett C-1000 | 8 / 8 | $1,677.76 | H17 |
| part-sale-invoice / part-sale-item | P229 | 69e17d03afacc931bc12ea81 | Teflon Seal..Quick Connect..Puritan Bennett C-1000 | 3 / 3 | $360.00 | None; new review |
| part-sale-invoice / part-sale-item | P232 | 69e17d03afacc931bc12ea83 | Bezel..Puritan Bennett C-1000 | 5 / 5 | $765.05 | H18 |
| part-sale-invoice / part-sale-item | P237 | 69e17d03afacc931bc12ea86 | O-Ring..Manifold..Puritan Bennett C-1000 | 5 / 5 | $301.85 | None; new review |
| part-sale-invoice / part-sale-item | P245 | 69e17d03afacc931bc12ea89 | Vent Valve..Puritan Bennett C-1000 | 1 / 1 | $722.25 | None; new review |
| part-sale-invoice / part-sale-item | P245U | 69e17d03afacc931bc12ea89 | Vent Valve..Puritan Bennett C-1000 | 5 / 5 | $2,717.02 | None; new review |
| part-sale-invoice / part-sale-item | P255 | 69e17d03afacc931bc12ea8c | Tubing..Vent Tube..Puritan Bennett C-1000 | 1 / 1 | $321.00 | None; new review |
| part-sale-invoice / part-sale-item | P256 | 69e17d03afacc931bc12ea8d | Caster..Single..60 MM or 3" | 4 / 4 | $840.00 | H22 |
| part-sale-invoice / part-sale-item | P259 | 69e17d03afacc931bc12ea90 | Teflon Spacer..Vent Valve..Puritan Bennett C-1000 | 2 / 2 | $731.20 | None; new review |
| part-sale-invoice / part-sale-item | P260 | 69e17d03afacc931bc12ea91 | Pin..Vent Lever..Puritan Bennett C-1000 | 2 / 2 | $47.20 | H23 |
| part-sale-invoice / part-sale-item | P275 | 69e17d03afacc931bc12ea9d | Contents Indicator Assembly..Includes Clear Lens, Body, Decal, Needle, Helix..Puritan Bennett C-1000/Companion T | 10 / 10 | $10,565.68 | H24 |
| part-sale-invoice / part-sale-item | P281 | 69e17d03afacc931bc12eaa1 | Brass Tee..3/16" Tube | 1 / 1 | $423.80 | None; new review |
| part-sale-invoice / part-sale-item | P289 | 69e17d03afacc931bc12eaa8 | Tubing..Warming Coil..Puritan Bennett C-1000 | 1 / 1 | $790.08 | None; new review |
| part-sale-invoice / part-sale-item | P295 | 69e17d03afacc931bc12eaac | Coil..Warming Coil #1..Puritan Bennett Companion T | 2 / 2 | $864.19 | None; new review |
| part-sale-invoice / part-sale-item | P299 | 69e17d03afacc931bc12eab0 | E-Clip..Puritan Bennett C-1000..QR Helios Stationary | 2 / 2 | $118.00 | None; new review |
| part-sale-invoice / part-sale-item | P306 | 69e17d03afacc931bc12eab5 | Relief Valve..Secondary 30 PSI..Puritan Bennett 41/31/21..Helios Universal Stationary..Caire Liberator | 3 / 3 | $706.40 | None; new review |
| part-sale-invoice / part-sale-item | P307 | 69e17d03afacc931bc12eab6 | Humidifier Adapter..Puritan Bennett 41/31/21 | 1 / 1 | $559.25 | None; new review |
| part-sale-invoice / part-sale-item | P308 | 69e17d03afacc931bc12eab7 | Quick Connect..Male..Puritan Bennett 41/31/21..Helios Stationary | 4 / 4 | $1,836.12 | None; new review |
| part-sale-invoice / part-sale-item | P310 | 69e17d03afacc931bc12eab9 | Vent Key Wrench..Puritan Bennett | 4 / 4 | $222.53 | H27 |
| part-sale-invoice / part-sale-item | P311U | 69e17d03afacc931bc12eaba | Vent Valve Assembly..Puritan Bennett 41/31/21 | 1 / 1 | $1,123.60 | None; new review |
| part-sale-invoice / part-sale-item | P322 | 69e17d03afacc931bc12eac5 | Contents Gauge..Puritan Bennett 31A | 1 / 1 | $153.02 | H29 |
| part-sale-invoice / part-sale-item | P325 | 69e17d03afacc931bc12eac8 | Contents Gauge Bottom | 9 / 9 | $8,861.44 | H31 |
| part-sale-invoice / part-sale-item | P326 | 69e17d03afacc931bc12eac9 | Contents Gauge Top | 7 / 7 | $9,824.64 | H32 |
| part-sale-invoice / part-sale-item | P328U | 69e17d03afacc931bc12eaca | Shroud..Puritan Bennett 41/31/21 | 1 / 1 | $252.00 | None; new review |
| part-sale-invoice / part-sale-item | P336 | 69e17d03afacc931bc12ead2 | O-Ring..Manifold..Puritan Bennett 41/31/21 | 1 / 1 | $52.25 | None; new review |
| part-sale-invoice / part-sale-item | P347 | 69e17d03afacc931bc12ead8 | Drain Bottle | 4 / 4 | $596.55 | None; new review |
| part-sale-invoice / part-sale-item | P365 | 69e17d03afacc931bc12eae4 | QR Knob..Puritan Bennett 41/31/21 | 5 / 5 | $1,012.22 | None; new review |
| part-sale-invoice / part-sale-item | P390U | 6a0dd840b3d67d5f05db4795 | Roller Base (USED) Only Available as Used | 1 / 1 | $900.00 | None; new review |
| part-sale-invoice / part-sale-item | P399 | 69e17d03afacc931bc12eae9 | Gauge Nipple..White Teflon | 6 / 6 | $614.78 | H35 |
| part-sale-invoice / part-sale-item | P410 | 69e17d03afacc931bc12eaf3 | Aluminum Hose Barb..Helios H300/H850 | 2 / 2 | $294.25 | None; new review |
| part-sale-invoice / part-sale-item | P413 | 69e17d03afacc931bc12eaf6 | Bag..Hip Pack..Helios 300 | 1 / 1 | $325.00 | None; new review |
| part-sale-invoice / part-sale-item | P442U | 69e17d03afacc931bc12eb07 | Valve Conserver Assembly..Helios H300 | 1 / 1 | $500.00 | None; new review |
| part-sale-invoice / part-sale-item | P448 | 69e17d03afacc931bc12eb0c | Silicone Tubing..1/16" X 3"..Helios H300/H850 | 1 / 1 | $230.00 | None; new review |
| part-sale-invoice / part-sale-item | P462 | 69e17d03afacc931bc12eb14 | Knob..Helios H850 | 1 / 1 | $70.25 | None; new review |
| part-sale-invoice / part-sale-item | P463 | 69e17d03afacc931bc12eb15 | Valve Conserver Assembly..Helios H850 | 1 / 1 | $761.34 | H36 |
| part-sale-invoice / part-sale-item | P513 | 69e17d03afacc931bc12eb2a | Decal..Oxygen Outlet..Helios Stationary | 2 / 2 | $28.84 | H37 |
| part-sale-invoice / part-sale-item | P521 | 69e17d03afacc931bc12eb2f | Contents Gauge..Helios Stationary | 2 / 2 | $494.34 | H38 |
| part-sale-invoice / part-sale-item | P521U | 69e17d03afacc931bc12eb2f | Contents Gauge..Helios Stationary | 3 / 3 | $1,071.07 | None; new review |
| part-sale-invoice / part-sale-item | P529 | 69e17d03afacc931bc12eb34 | Black Tubing..1/16" X 12"..Helios H300..Helios Stationary | 1 / 1 | $95.90 | None; new review |
| part-sale-invoice / part-sale-item | P530 | 69e17d03afacc931bc12eb35 | Brass Barb Fitting..Small - 1/16"..Helios H300/H850..Helios Stationary | 1 / 1 | $23.60 | None; new review |
| part-sale-invoice / part-sale-item | P531 | 69e17d03afacc931bc12eb36 | Brass Barb Fitting..Large - 1/8"..Helios H300/H850 | 1 / 1 | $23.60 | None; new review |
| part-sale-invoice / part-sale-item | P540 | 69e17d03afacc931bc12eb3e | Economizer Valve..Helios Universal..24 PSI | 1 / 1 | $430.56 | None; new review |
| part-sale-invoice / part-sale-item | P553 | 69e17d03afacc931bc12eb4a | Pressure Gauge..Helios Standard | 2 / 2 | $287.42 | None; new review |
| part-sale-invoice / part-sale-item | P554 | 69e17d03afacc931bc12eb4b | Pressure Gauge Lens..Helios Standard | 3 / 3 | $408.24 | None; new review |
| part-sale-invoice / part-sale-item | P601 | 69e17d03afacc931bc12eb54 | Male Nut..Caire Stroller | 2 / 2 | $47.74 | None; new review |
| part-sale-invoice / part-sale-item | P603 | 69e17d03afacc931bc12eb56 | Decal..Bottom Decal..Caire | 13 / 13 | $997.04 | H39 |
| part-sale-invoice / part-sale-item | P605 | 69e17d03afacc931bc12eb58 | Decal..Stroller..Caire | 11 / 11 | $741.60 | H40 |
| part-sale-invoice / part-sale-item | P609 | 69e17d03afacc931bc12eb5c | Shroud..Caire Liberator | 1 / 1 | $318.00 | H41 |
| part-sale-invoice / part-sale-item | P612 | 69e17d03afacc931bc12eb5e | Strap..Caire Stroller | 4 / 4 | $1,560.90 | None; new review |
| part-sale-invoice / part-sale-item | P614 | 69e17d03afacc931bc12eb60 | Relief Valve..Primary With O-Ring..23 PSI..Caire Stroller | 1 / 1 | $151.45 | None; new review |
| part-sale-invoice / part-sale-item | P618 | 69e17d03afacc931bc12eb63 | Drain Tube - Not Including Rivet..Caire Liberator | 1 / 1 | $96.50 | None; new review |
| part-sale-invoice / part-sale-item | P620 | 69e17d03afacc931bc12ebe9 | Drain Bottle Kit..Caire Liberator | 1 / 1 | $330.00 | None; new review |
| part-sale-invoice / part-sale-item | P631 | 69e17d03afacc931bc12eb6f | Quick Connect..Male..Puritan Bennett - Posi Lock | 1 / 1 | $188.32 | None; new review |
| part-sale-invoice / part-sale-item | P634 | 69e17d03afacc931bc12eb72 | Meter..Caire | 4 / 4 | $3,404.00 | H42 |
| part-sale-invoice / part-sale-item | P640 | 69e17d03afacc931bc12eb78 | Fill Tube..Caire Stroller | 2 / 2 | $457.50 | None; new review |
| part-sale-invoice / part-sale-item | P643 | 69e17d03afacc931bc12eb7b | Tubing..Primary..Caire Stroller | 3 / 3 | $241.57 | H43 |
| part-sale-invoice / part-sale-item | P645 | 69e17d03afacc931bc12eb7d | Decal..Hi Flow..Caire | 3 / 3 | $600.00 | H44 |
| part-sale-invoice / part-sale-item | P652 | 69e17d03afacc931bc12eb84 | Coil Assembly..Caire Stroller..Bottom Inlet | 5 / 5 | $1,414.95 | H45 |
| part-sale-invoice / part-sale-item | P654 | 69e17d03afacc931bc12eb86 | Sleeve..Quick Release..Caire Liberator | 1 / 1 | $110.30 | H46 |
| part-sale-invoice / part-sale-item | P662 | 69e17d03afacc931bc12eb8a | Relief Valve..Primary 20 PSI..Caire Stroller | 5 / 5 | $3,096.00 | None; new review |
| part-sale-invoice / part-sale-item | P671 | 69e17d03afacc931bc12eb92 | Vent Key Wrench..Caire Liberator | 3 / 3 | $187.50 | H47 |
| part-sale-invoice / part-sale-item | P675 | 69e17d03afacc931bc12eb95 | Nomex Pad..Caire Stroller | 5 / 5 | $856.00 | H48 |
| part-sale-invoice / part-sale-item | P682 | 69e17d03afacc931bc12eb9b | Plug..Plastic..Caire Stroller | 9 / 9 | $963.00 | H49 |
| part-sale-invoice / part-sale-item | P687 | 69e17d03afacc931bc12eba0 | Side Cover..Wide..Caire Stroller | 15 / 15 | $6,331.52 | H50 |
| part-sale-invoice / part-sale-item | P688 | 69e17d03afacc931bc12eba1 | Blue Dome..With Opening..Caire Stroller | 11 / 11 | $933.75 | H51 |
| part-sale-invoice / part-sale-item | P689 | 69e17d03afacc931bc12eba2 | Black Leather Case..Top Fill | 2 / 2 | $1,378.80 | H52 |
| part-sale-invoice / part-sale-item | P693 | 69e17d03afacc931bc12eba6 | Top Cover..Wide..Caire Stroller | 2 / 2 | $127.60 | H53 |
| part-sale-invoice / part-sale-item | P694 | 69e17d03afacc931bc12eba7 | Condensation Cup..Caire Stroller | 1 / 1 | $87.50 | None; new review |
| part-sale-invoice / part-sale-item | P695 | 69e17d03afacc931bc12eba8 | Grommet..Condensation Cup..Caire Stroller | 2 / 2 | $88.50 | None; new review |
| part-sale-invoice / part-sale-item | P696 | 69e17d03afacc931bc12eba9 | Plunger..Condensation Cup..Caire Stroller | 2 / 2 | $120.00 | None; new review |
| part-sale-invoice / part-sale-item | P709 | 6a0b5121856f4b5532085b9e | Transfer Line..Oxygen..4 Foot..1/2" With Full Armor..Brass Nuts | 3 / 3 | $511.50 | None; new review |
| part-sale-invoice / part-sale-item | P709-SS | 6a4663475bb319f96a38fa5f | Transfer Line..Oxygen 4 Foot 1/2" With Full Armor SS Nuts | 1 / 1 | $381.00 | None; new review |
| part-sale-invoice / part-sale-item | P710 | 6a1884d4f83594ef99bac272 | Transfer Line Oxygen 6 Foot 1/2" With Full Armor Brass Nuts | 5 / 5 | $1,417.50 | H54 |
| part-sale-invoice / part-sale-item | P711 | 6a0363c401186a2594c0d874 | Transfer Line..Oxygen..8 Foot..1/2" With Full Armor..Brass Nuts | 4 / 4 | $2,510.75 | None; new review |
| part-sale-invoice / part-sale-item | P711-LN2 | 6a79cf959c847523c1812e26 | Transfer Line Nitrogen 8 Foot..1/2" With Full Armor Brass Nuts | 1 / 1 | $238.25 | H55 |
| part-sale-invoice / part-sale-item | P712 | 6a03641e01186a2594c0d8d8 | Transfer Line..Oxygen..10 Foot..1/2" With Full Armor..Brass Nuts | 1 / 1 | $254.70 | None; new review |
| part-sale-invoice / part-sale-item | P712-SS | 6a4fa98e0e09580b67802b3e | Transfer Line..Oxygen 10 Foot 1/2" With Full Armor SS Nuts | 1 / 1 | $794.10 | None; new review |
| part-sale-invoice / part-sale-item | P713 | 6a75e9199c847523c180a6c9 | Transfer Line..Oxygen..12 Foot..1/2" With Full Armor..Brass Nuts | 1 / 1 | $840.75 | H56 |
| part-sale-invoice / part-sale-item | P714 | 6a15d111a7ce5b3352f36ea5 | Fill Head..Dual..Puritan Bennett and Caire | 3 / 3 | $5,305.86 | H57 |
| part-sale-invoice / part-sale-item | P715 | 6a2c2c38d4f6f954e205fc0d | Fill Head Puritan Bennett | 4 / 4 | $5,250.00 | H58 |
| part-sale-invoice / part-sale-item | P717 | 6a303c18132725747b2c7fe4 | Transfer Line Oxygen 15 Foot 1/2" With Full Armor Brass Nuts | 1 / 1 | $1,581.25 | None; new review |
| part-sale-invoice / part-sale-item | P720 | 6a79cf389c847523c1812d2d | Source Adapter | 2 / 2 | $670.00 | H59 |
| part-sale-invoice / part-sale-item | P721 | 6a2c2cb9d4f6f954e205fcf7 | Reducer Assembly 1" Female X 5/8" Male | 1 / 1 | $1,125.00 | None; new review |
| part-sale-invoice / part-sale-item | P727 | 6a15d20ca7ce5b3352f36fbf | Gauge Assembly..Includes: P724 - Gauge P722 - Reducer P213 - Hose Barb | 2 / 2 | $216.72 | None; new review |
| part-sale-invoice / part-sale-item | P729 | 6a7f40f4c724b5ba605f8879 | Adapter 5/8" Male Flare X 3/4" Male NPT | 1 / 1 | $199.70 | H60 |
| part-sale-invoice / part-sale-item | P729-90 | 6a7f4152c724b5ba605f8943 | Adapter 5/8" Male Flare X 3/4" Male NPT 90 Degree Elbow | 1 / 1 | $80.91 | H61 |
| part-sale-invoice / part-sale-item | P738 | 69e17d03afacc931bc12ebb6 | Screw..Bottom Case..Caire Stroller | 2 / 2 | $120.80 | None; new review |
| part-sale-invoice / part-sale-item | P747 | 6a2c2d00d4f6f954e205fd84 | Adapter 1" Male Flare X 1" Male NPT | 1 / 1 | $872.40 | None; new review |
| part-sale-invoice / part-sale-item | P750 | 69e17d03afacc931bc12ebba | Lip Seal..Rubber | 2 / 2 | $433.62 | None; new review |
| part-sale-invoice / part-sale-item | P761 | 6a15d4cba7ce5b3352f372d1 | Transfer Line Oxygen 10 Foot 1" With Full Armor Brass Nuts | 1 / 1 | $1,310.97 | None; new review |
| part-sale-invoice / part-sale-item | P773 | 6a2864e051a3bf6e43f131da | Transfer Line Oxygen 12 Foot 1" With Full Armor Brass Nuts | 1 / 1 | $998.00 | None; new review |
| part-sale-invoice / part-sale-item | P799 | 69e17d03afacc931bc12ebc1 | Bottle Bracket..Caire Liberator | 2 / 2 | $527.50 | None; new review |
| part-sale-invoice / part-sale-item | P809 | 69e17d03afacc931bc12ebc3 | FCV..1/4 - 6 LPM..19.5 PSI..Puritan Bennett Stationary | 3 / 3 | $2,193.50 | None; new review |
| part-sale-invoice / part-sale-item | P810 | 69e17d03afacc931bc12ebc4 | FCV..1/2 - 10 LPM..19.5 PSI..Puritan Bennett Stationary | 1 / 1 | $1,070.00 | None; new review |
| part-sale-invoice / part-sale-item | P818 | 69e17d03afacc931bc12ebc5 | FCV w/ Knob, Plate, and Dial..0 - 10 LPM..External With Fittings..Helios Stationary | 1 / 1 | $694.50 | None; new review |
| part-sale-invoice / part-sale-item | P821 | 69e17d03afacc931bc12ebc8 | FCV - Side Inlet..0-15 LPM..16 Position..Caire Liberator | 1 / 1 | $497.25 | H63 |
| part-sale-invoice / part-sale-item | P822 | 69e17d03afacc931bc12ebc9 | Dial..16 Position..0-15 LPM..Caire | 1 / 1 | $337.50 | None; new review |
| part-sale-invoice / part-sale-item | P823 | 69e17d03afacc931bc12ebca | Locking Plate..Metal..16 Position..Caire | 1 / 1 | $137.70 | None; new review |
| part-sale-invoice / part-sale-item | P849 | 69e17d03afacc931bc12ebd0 | Dial..1/2-15..Puritan Bennett | 2 / 2 | $96.00 | None; new review |
| part-sale-invoice / part-sale-item | P851 | 69e17d03afacc931bc12ebd2 | Dial..1/4-6..Puritan Bennett | 7 / 7 | $499.20 | H64 |
| part-sale-invoice / part-sale-item | P852 | 69e17d03afacc931bc12ebd3 | Dial..1/2-10..Puritan Bennett | 1 / 1 | $76.80 | None; new review |
| part-sale-invoice / part-sale-item | P853 | 69e17d03afacc931bc12ebd4 | FCV..0 - 15 LPM..22 PSI..Puritan Bennett Companion T | 2 / 2 | $1,979.50 | H65 |
| part-sale-invoice / part-sale-item | P861 | 69e17d03afacc931bc12ebd6 | Locking Plate..Grey..Puritan Bennett | 7 / 7 | $556.80 | H67 |
| part-sale-invoice / part-sale-item | P866 | 69e17d03afacc931bc12ebd8 | Dial..1/4-6..Caire | 1 / 1 | $76.80 | None; new review |
| part-sale-invoice / part-sale-item | P881 | 69e17d03afacc931bc12ebe0 | Locking Plate..Caire - Black..12 Position | 2 / 2 | $115.20 | H68 |
| part-sale-invoice / part-sale-item | P882 | 69e17d03afacc931bc12ebe1 | Knob..Red - Small..Caire Stroller | 1 / 1 | $74.60 | None; new review |
| part-sale-invoice / part-sale-item | P992 | 6a79c78b9c847523c181190c | Relief Valve 150 PSI 1/4" NPT | 2 / 2 | $481.95 | None; new review |
| part-sale-invoice / part-sale-item | PC101 | 6a17329cab01c63a94fa8811 | Decal Perfecto2 Black Shield | 4 / 4 | $1,961.25 | H69 |
| part-sale-invoice / part-sale-item | PC102 | 69fde843986fc03193f58767 | Decal Perfecto2 V Blue Shield | 7 / 7 | $2,755.20 | H70 |
| part-sale-invoice / part-sale-item | PC104-2 | 6a22cee380153fcb39b73dcb | Decal Black Shield 2 Holes Concentrator | 1 / 1 | $236.00 | None; new review |
| part-sale-invoice / part-sale-item | PC105 | 6a0b09caeeb45c0143075bbf | Decal..Warning..Concentrator | 2 / 2 | $335.00 | None; new review |
| standalone-invoice / standalone-item | (none) | (none) | Shipping described item | 2 / 2 | $1,726.79 | None; new review |
| standalone-invoice / standalone-item | P728 | 6a79e6419c847523c1816065 | Pressure Gauge 2.5" 400 PSI 1/4" Bottom Inlet | 1 / 1 | $58.17 | H71 |
| standalone-invoice / standalone-item | P900 | 69f9fdbcd4b7efe64077058b | Liquid Test service | 1 / 1 | $58.85 | None; new review |
| standalone-invoice / standalone-item | P900-V | 6a3a9c56bb6ccdd834ed2ede | Liquid Test service | 1 / 1 | $58.85 | None; new review |
| standalone-invoice / standalone-item | P950 | 69f9fd93d4b7efe640770570 | Labor and supplies / tank-work service; operational details omitted | 5 / 5 | $20,324.19 | None; new review |
| standalone-invoice / standalone-item | P950-I | 6a0b6404856f4b5532087dbd | Labor/supplies and vessel-inspection service; bundled parts/labor | 2 / 2 | $8,737.65 | None; new review |
| standalone-invoice / standalone-item | P950-V | 6a2ad71cee706d8c5ae2e9dc | Labor and supplies / tank-work service; operational details omitted | 14 / 14 | $13,917.05 | H72 |
| standalone-invoice / standalone-item | P975 | 69e17d03afacc931bc12ebe3 | Revac service | 1 / 1 | $331.02 | None; new review |
| standalone-invoice / standalone-item | P975-V | 6a2ad818ee706d8c5ae2eb68 | Revac service | 2 / 2 | $353.10 | None; new review |
| standalone-invoice / standalone-item | Repair | 6a03458801186a2594c0c89f | [free text withheld; review source] | 12 / 12 | $30,659.36 | H73 |
| standalone-invoice / standalone-item | Shipping | 6a6212d9ac39c3a17ee0039e | Shipping described item | 2 / 2 | $1,127.91 | None; new review |
| standalone-invoice / standalone-item | T9022 | 6a7c9a3d4fbfa8319802b4ba | Cryogenic Economizer 300 PSI Combination Pressure Builder/Economizer 1/4" FNPT X 3 | 1 / 1 | $350.00 | H74 |

## Deferred historical rules and additional exact mappings

**51 of the 51 deferred selectors** add coverage: H07, H09, H10, H11, H17, H18, H22, H23, H24, H27, H29, H31, H32, H35, H36, H37, H38, H39, H40, H41, H42, H43, H44, H45, H46, H47, H48, H49, H50, H51, H52, H53, H54, H55, H56, H57, H58, H59, H60, H61, H63, H64, H65, H67, H68, H69, H70, H71, H72, H73, H74. They account for 263 lines / $124,496.67. 0 were not demonstrated to add coverage, which does not prove obsolescence.

| Rule | Exact reference | Exact part ID | Source type | Historical account |
| --- | --- | --- | --- | --- |
| H07 | P204 | 69e17d03afacc931bc12ea6a | part-sale-invoice | 4200 |
| H09 | P207 | 69fb39f545a184dc62946a7d | part-sale-invoice | 4200 |
| H10 | P208 | 69e17d03afacc931bc12ea6d | part-sale-invoice | 4200 |
| H11 | P209 | 69e17d03afacc931bc12ea6e | part-sale-invoice | 4200 |
| H17 | P228 | 69e17d03afacc931bc12ea80 | part-sale-invoice | 4200 |
| H18 | P232 | 69e17d03afacc931bc12ea83 | part-sale-invoice | 4200 |
| H22 | P256 | 69e17d03afacc931bc12ea8d | part-sale-invoice | 4200 |
| H23 | P260 | 69e17d03afacc931bc12ea91 | part-sale-invoice | 4200 |
| H24 | P275 | 69e17d03afacc931bc12ea9d | part-sale-invoice | 4200 |
| H27 | P310 | 69e17d03afacc931bc12eab9 | part-sale-invoice | 4200 |
| H29 | P322 | 69e17d03afacc931bc12eac5 | part-sale-invoice | 4200 |
| H31 | P325 | 69e17d03afacc931bc12eac8 | part-sale-invoice | 4200 |
| H32 | P326 | 69e17d03afacc931bc12eac9 | part-sale-invoice | 4200 |
| H35 | P399 | 69e17d03afacc931bc12eae9 | part-sale-invoice | 4200 |
| H36 | P463 | 69e17d03afacc931bc12eb15 | part-sale-invoice | 4200 |
| H37 | P513 | 69e17d03afacc931bc12eb2a | part-sale-invoice | 4200 |
| H38 | P521 | 69e17d03afacc931bc12eb2f | part-sale-invoice | 4200 |
| H39 | P603 | 69e17d03afacc931bc12eb56 | part-sale-invoice | 4200 |
| H40 | P605 | 69e17d03afacc931bc12eb58 | part-sale-invoice | 4200 |
| H41 | P609 | 69e17d03afacc931bc12eb5c | part-sale-invoice | 4200 |
| H42 | P634 | 69e17d03afacc931bc12eb72 | part-sale-invoice | 4200 |
| H43 | P643 | 69e17d03afacc931bc12eb7b | part-sale-invoice | 4200 |
| H44 | P645 | 69e17d03afacc931bc12eb7d | part-sale-invoice | 4200 |
| H45 | P652 | 69e17d03afacc931bc12eb84 | part-sale-invoice | 4200 |
| H46 | P654 | 69e17d03afacc931bc12eb86 | part-sale-invoice | 4200 |
| H47 | P671 | 69e17d03afacc931bc12eb92 | part-sale-invoice | 4200 |
| H48 | P675 | 69e17d03afacc931bc12eb95 | part-sale-invoice | 4200 |
| H49 | P682 | 69e17d03afacc931bc12eb9b | part-sale-invoice | 4200 |
| H50 | P687 | 69e17d03afacc931bc12eba0 | part-sale-invoice | 4200 |
| H51 | P688 | 69e17d03afacc931bc12eba1 | part-sale-invoice | 4200 |
| H52 | P689 | 69e17d03afacc931bc12eba2 | part-sale-invoice | 4200 |
| H53 | P693 | 69e17d03afacc931bc12eba6 | part-sale-invoice | 4200 |
| H54 | P710 | 6a1884d4f83594ef99bac272 | part-sale-invoice | 4200 |
| H55 | P711-LN2 | 6a79cf959c847523c1812e26 | part-sale-invoice | 4200 |
| H56 | P713 | 6a75e9199c847523c180a6c9 | part-sale-invoice | 4200 |
| H57 | P714 | 6a15d111a7ce5b3352f36ea5 | part-sale-invoice | 4200 |
| H58 | P715 | 6a2c2c38d4f6f954e205fc0d | part-sale-invoice | 4200 |
| H59 | P720 | 6a79cf389c847523c1812d2d | part-sale-invoice | 4200 |
| H60 | P729 | 6a7f40f4c724b5ba605f8879 | part-sale-invoice | 4200 |
| H61 | P729-90 | 6a7f4152c724b5ba605f8943 | part-sale-invoice | 4200 |
| H63 | P821 | 69e17d03afacc931bc12ebc8 | part-sale-invoice | 4200 |
| H64 | P851 | 69e17d03afacc931bc12ebd2 | part-sale-invoice | 4200 |
| H65 | P853 | 69e17d03afacc931bc12ebd4 | part-sale-invoice | 4200 |
| H67 | P861 | 69e17d03afacc931bc12ebd6 | part-sale-invoice | 4200 |
| H68 | P881 | 69e17d03afacc931bc12ebe0 | part-sale-invoice | 4200 |
| H69 | PC101 | 6a17329cab01c63a94fa8811 | part-sale-invoice | 4200 |
| H70 | PC102 | 69fde843986fc03193f58767 | part-sale-invoice | 4200 |
| H71 | P728 | 6a79e6419c847523c1816065 | standalone-invoice | 4200 |
| H72 | P950-V | 6a2ad71cee706d8c5ae2e9dc | standalone-invoice | 4100 |
| H73 | Repair | 6a03458801186a2594c0c89f | standalone-invoice | 4100 |
| H74 | T9022 | 6a7c9a3d4fbfa8319802b4ba | standalone-invoice | 4200 |

There are **80 unmatched tuples without a deferred historical selector**. Recommend reviewing each exact family/key/reference/part-ID tuple shown above. Identified components may support 4200 Parts; reviewed repair/testing services 4100 Repair; equipment sales with ownership transferred 4300 Equipment; explicit freight 4400 Shipping Revenue. These are candidate account purposes, not automatic approvals. Confirm changed part identities, used/replacement bottle versus whole-unit/exchange treatment, standalone service/part distinctions, and negative/credit evidence. Missing identities or free-text references require source review. Never broaden a selector or drop its part-ID requirement just to obtain coverage.

## Special classifications and source evidence

| State | Invoices | Known signed source USD |
| --- | --- | --- |
| active | 444 | $851,377.77 |

Non-null discount headers: 0; null discount headers: 444. Null is unknown/unrepresented, not proof of no discounts. Negative/credit/cancelled evidence is included in signed totals and is not automatically draft-eligible. Existing readiness blocks unsupported tax/discount/negative evidence; it must not be mapped into ordinary positive revenue to force acceptance.

Repair, Revac and Liquid Test references require service-versus-commodity review; “Liquid Test” is not itself a liquid inventory sale. New/used components and replacement bottles may need different treatment from complete equipment. All explicit shipping stays in dedicated Revenue 4400, not Expense 6600 and not Parts/Repair. Broad repair/equipment rules can match newly observed references technically without establishing their commercial meaning; see the complete inventory below.

| Source quality flag | Invoice occurrences |
| --- | --- |
| current-source-amount-not-immutable-original | 444 |
| invalid-line-quantity-or-price | 2 |
| legacy-source-identity | 362 |
| missing-customer-terms | 4 |
| missing-due-date | 366 |
| positional-line-identity | 444 |
| revenue-classification-review | 300 |
| terms-snapshot-unavailable | 362 |

## Specific candidate plan and blockers

A second complete 17-request scan reproduced all 13 monthly scan revisions exactly. Total ERP GETs for the assessment and cross-check: **34**. No repeated records were added to totals. The verified extraction is complete for records eligible under the current development v1 endpoint; zero returned records before February 2026 do not prove that no historical invoices existed in other datasets or outside source eligibility.

| Potential addition | Exact rules | Lines newly covered | Known USD | Proposed treatment; NOT approved |
| --- | --- | --- | --- | --- |
| Deferred historical rules | 51 | 263 | $124,496.67 | Reconfirm their documented targets, including standalone service rules |
| New part-sale tuples | 72 | 130 | $42,929.94 | 4200 Parts candidates; exact tuples listed above |
| New standalone service tuples | 6 | 12 | $29,863.66 | 4100 Repair candidates; see exact list below |
| Identified standalone Shipping item | 1 | 2 | $1,127.91 | 4400 Shipping Revenue candidate |
| Unidentified standalone shipping | 0 | 2 | $1,726.79 | BLOCKED: no safe selector under current schema |

| Standalone reference | Exact part ID | Lines | Known USD | Candidate account / decision |
| --- | --- | --- | --- | --- |
| P900 | 69f9fdbcd4b7efe64077058b | 1 | $58.85 | 4100: confirm service / bundled parts-labor policy |
| P900-V | 6a3a9c56bb6ccdd834ed2ede | 1 | $58.85 | 4100: confirm service / bundled parts-labor policy |
| P950 | 69f9fd93d4b7efe640770570 | 5 | $20,324.19 | 4100: confirm service / bundled parts-labor policy |
| P950-I | 6a0b6404856f4b5532087dbd | 2 | $8,737.65 | 4100: confirm service / bundled parts-labor policy |
| P975 | 69e17d03afacc931bc12ebe3 | 1 | $331.02 | 4100: confirm service / bundled parts-labor policy |
| P975-V | 6a2ad818ee706d8c5ae2eb68 | 2 | $353.10 | 4100: confirm service / bundled parts-labor policy |
| Shipping | 6a6212d9ac39c3a17ee0039e | 2 | $1,127.91 | 4400: billed freight, preserve separate source line |

The 72 new part-sale exact pairs are all rows marked “None; new review” in the unmatched table with sourceType part-sale-invoice. This is their complete proposed selector list, with 4200 as a candidate rather than blanket approval. Of particular interest are P245U/P311U/P328U/P442U/P521U/P390U: confirm condition and commercial treatment; a U suffix alone does not prove a separate used-parts policy. P347 Drain Bottle, P620 Drain Bottle Kit and P799 Bottle Bracket are component/accessory descriptions; distinguish these from a whole replacement vessel. P261U Bottle (USED) is included in the user-approved 39-rule baseline; that approval is not evidence that every newly observed bottle or accessory belongs to the same category.

**Freight blocker:** two standalone-item lines describe shipping but have itemReference=null and partId=null. Their 1,726.79 USD remains unmatched. Mapping rules cannot select on description, and standalone-item rules require an itemReference or partId. Do not invent an identifier, weaken the schema, or add an unrestricted standalone rule. Request an ERP-owned review to establish a valid stable shipping-item identity or other faithful supported source representation, preserving amounts and avoiding duplicate header shipping. No ERP correction was made. The other Shipping pair (reference Shipping, partId 6a6212d9ac39c3a17ee0039e) can use an exact standalone-item rule to existing 4400.

Adding all 51 historical and all 79 technically expressible new candidates would create **169 rules**, hypothetically resolving **3,366/3,368 lines worth $849,650.98**, leaving the two anonymous freight lines. This was checked in memory with the actual mappingSchema and resolveLine over all 183 observed identity tuples; zero equal-precedence ambiguities resulted. It is a technical upper bound pending business decisions, not an installation approval. The 90-rule historical-plus-baseline intermediate set resolves **3,222 lines / $775,729.47**; its remaining 146 lines total **$75,648.30**.

### Additional semantic and source-quality findings

- Explicit shipping-income: **219 lines / $34,102.44**, already matched to 4400. The four standalone Shipping items add **$2,854.70**, for **223 identified freight-description/classification lines / $36,957.14** across both representations. Do not route these items to ordinary Parts or Repair. No new freight account is required.
- Repair-classified service lines: **2,356 / $460,384.54**. P985 adds **five lines / $408.00**, technically matched by the broad repair rule but with no descriptive service meaning beyond unit/context evidence. Confirm its catalog/service definition before accepting that semantic coverage.
- Liquid Test: repair-family P900/P900-V total **27 lines / $1,143.30**; two standalone exact candidates add **$117.70**. These descriptions indicate testing services rather than liquid inventory sales.
- Revac references P975/P975-V: repair family **22 lines / $3,361.87**, plus three standalone candidates **$684.12**. Fourteen repair P975-V descriptions are unit/context-only; the reference classification does not independently prove the job scope.
- Standalone P950 and P950-I need an explicit bundled labor/supplies/inspection policy, not automatic parts-revenue classification. Historical P950-V and Repair exact rules also need current review; operational serial/customer text is omitted.
- Equipment P110/P111/P112: **58 lines / $28,285.00** technically matched. Confirm ownership transfer and treatment of exchanges/rentals/deposits, especially new populations under a broad equipment rule.
- P521/P521U and P245/P245U each share a part ID within part-sale invoices. Exact reference AND partId matching keeps these selectors distinct; a part-ID-only broadening could create unintended matches. No identity collision was inferred solely from these variants.
- **Two invoices carry invalid-line-quantity-or-price**, independently of the anonymous shipping issue. Readiness/source evidence must be reviewed before future financial use even if account matching succeeds. There were no negative lines or non-active invoice states returned. No explicit return/credit/discount item was identified; all 444 discount headers remain null, not certified zero.

### Recommended installation sequence

Do not treat the October-only 39-rule set as annual coverage. First obtain current approval for the 51 observed historical exact selectors, then review the 72 new component and seven new standalone service/freight selectors individually. Resolve P985 and bundled-service/used-component/equipment decisions even where broad rules already match. Resolve the two anonymous freight lines and the two quantity/price-flagged invoices under separate source-review scope. Preserve the intended AR 1100 selection and existing account safeguards. Only then finalize and authorize the exact installation batch; do not install the hypothetical 169 rules automatically or claim complete annual readiness.

## Final installation recommendation

The date range is retrieved completely; classification decisions still remain. Keep the requested 39-rule comparison as the baseline. Add only observed deferred historical selectors and genuinely new exact tuples after separate business approval; do not install all 51 deferred rules blindly. Revalidate current account IDs/types and intended AR 1100 before any installation. This task did not re-read or modify accounts.

The current request identifies the 39 rules as approved, and all 39 were assessed as specified. This assessment does not revoke that baseline approval or authorize installation; additional exact rules and newly observed commercial scenarios still require their own review. Record decisions for new equipment/service/bottle/credit types, keep authoritative=false, and obtain separate permission for mapping installation and any parallel import. The full-year assessment does not authorize a single full-year import beyond existing atomic bounds.

## Completeness ledger

| From | Through | Returned invoices | Returned lines | GET requests | Scan revision |
| --- | --- | --- | --- | --- | --- |
| 2025-10-13 | 2025-10-31 | 0 | 0 | 1 | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| 2025-11-01 | 2025-11-30 | 0 | 0 | 1 | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| 2025-12-01 | 2025-12-31 | 0 | 0 | 1 | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| 2026-01-01 | 2026-01-31 | 0 | 0 | 1 | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| 2026-02-01 | 2026-02-28 | 2 | 37 | 1 | d5ea13e6b775c9f6bbd0210acac514c06ea98d0e62b80384b5db521ac96368a5 |
| 2026-03-01 | 2026-03-31 | 13 | 217 | 1 | 9e4f54ad1a7f623bd2bcdd8c3dca220edc7da8694e5dc9d61ac3b3100bed057e |
| 2026-04-01 | 2026-04-30 | 19 | 364 | 1 | 8df12de216e9bcf9773df686d0e3b88014908f2c8aa0e8e8594545be7ef2695a |
| 2026-05-01 | 2026-05-31 | 43 | 406 | 1 | faafcb93d99b38eb23221231142d68584c333a6578c5ad2b01e5727f6292fc60 |
| 2026-06-01 | 2026-06-30 | 84 | 447 | 2 | 3bb042d749d8d7b158b1c0a66b4e59ca60b917a2d6341d1141b0375e77f183af |
| 2026-07-01 | 2026-07-31 | 93 | 705 | 2 | e2a6cfa7c358445747d347d98279734ec56e60f1d0c4a14e827083b0694389f8 |
| 2026-08-01 | 2026-08-31 | 81 | 496 | 2 | e02ac77a0572d486fd24506932959f27372ca27691a9fb0da926cba7977456e7 |
| 2026-09-01 | 2026-09-30 | 73 | 538 | 2 | 737a1955a04a89ef3b13df31a8b60fa0c038f97036e7797186f651b7949d01ab |
| 2026-10-01 | 2026-10-12 | 36 | 158 | 1 | 7bdaee65dcedb8e623bda2ba5225772dc2e68f18f503339311e8a446b3e65e7b |

No unverified date gaps.



## Complete identity inventory

This aggregate catalog includes matched items to expose new references under broad rules. No customer/invoice identifiers or unit serials are included.

| Source type / key | Reference | Part ID | Description summary | Lines | Known USD | 39-rule result |
| --- | --- | --- | --- | --- | --- | --- |
| part-sale-invoice / part-sale-item | P197 | 69e17d03afacc931bc12ea64 | Screw..6-32 X 7/8" SS..Puritan Bennett C-1000 | 1 | $107.00 | unmatched |
| part-sale-invoice / part-sale-item | P198 | 69e17d03afacc931bc12ea65 | Screw..6-32 X 1 1/4" SS..Puritan Bennett C-1000 | 2 | $107.00 | unmatched |
| part-sale-invoice / part-sale-item | P199 | 69e17d03afacc931bc12ea66 | Screw..6-32 X 2 SS..Puritan Bennett C-1000 | 1 | $100.50 | unmatched |
| part-sale-invoice / part-sale-item | P201 | 69e17d03afacc931bc12ea67 | Side Cover..Side A..Puritan Bennett C-1000 | 45 | $26,876.46 | matched |
| part-sale-invoice / part-sale-item | P202 | 69e17d03afacc931bc12ea68 | Side Cover..Side B..Puritan Bennett C-1000 | 46 | $19,185.10 | matched |
| part-sale-invoice / part-sale-item | P203 | 69e17d03afacc931bc12ea69 | Strap..Puritan Bennett C-1000 | 14 | $1,893.42 | matched |
| part-sale-invoice / part-sale-item | P204 | 69e17d03afacc931bc12ea6a | Decal..Keep Upright..Puritan Bennett C-1000 | 18 | $2,261.88 | unmatched |
| part-sale-invoice / part-sale-item | P205 | 69e17d03afacc931bc12ea6b | Decal..Warning..Puritan Bennett C-1000 | 20 | $2,529.68 | matched |
| part-sale-invoice / part-sale-item | P206 | 69e17d03afacc931bc12ea6c | Rubber Foot..Puritan Bennett C-1000 | 3 | $170.00 | matched |
| part-sale-invoice / part-sale-item | P207 | 69fb39f545a184dc62946a7d | Rubber Foot..Sheet of 56 | 11 | $818.55 | unmatched |
| part-sale-invoice / part-sale-item | P208 | 69e17d03afacc931bc12ea6d | Brass Nut..3/16" | 4 | $269.28 | unmatched |
| part-sale-invoice / part-sale-item | P209 | 69e17d03afacc931bc12ea6e | Brass Ferrule..3/16" | 5 | $332.76 | unmatched |
| part-sale-invoice / part-sale-item | P210 | 69e17d03afacc931bc12ea6f | Brass Nut..1/4" | 3 | $263.20 | matched |
| part-sale-invoice / part-sale-item | P211 | 69e17d03afacc931bc12ea70 | Brass Ferrule..1/4" | 9 | $940.00 | matched |
| part-sale-invoice / part-sale-item | P212 | 69e17d03afacc931bc12ea71 | Relief Valve Adapter..Aluminum..Puritan Bennett C-1000 | 4 | $385.60 | matched |
| part-sale-invoice / part-sale-item | P214 | 69e17d03afacc931bc12ea73 | Relief Valve..Primary 22 PSI..Puritan Bennett C-1000 | 22 | $9,289.16 | matched |
| part-sale-invoice / part-sale-item | P215 | 69e17d03afacc931bc12ea74 | Relief Valve..Secondary 30 PSI..Puritan Bennett C-1000 | 2 | $794.70 | unmatched |
| part-sale-invoice / part-sale-item | P216 | 69f8f676d4b7efe64076f895 | Quick Connect Assembly..Female..Puritan Bennett C-1000 | 5 | $2,655.50 | matched |
| part-sale-invoice / part-sale-item | P220 | 69e17d03afacc931bc12ea78 | Tubing..Fill Tube..Puritan Bennett C-1000 | 7 | $1,530.94 | matched |
| part-sale-invoice / part-sale-item | P222 | 69e17d03afacc931bc12ea7a | Decal..Companion T | 7 | $812.00 | matched |
| part-sale-invoice / part-sale-item | P228 | 69e17d03afacc931bc12ea80 | Nomex Pad..Puritan Bennett C-1000 | 8 | $1,677.76 | unmatched |
| part-sale-invoice / part-sale-item | P229 | 69e17d03afacc931bc12ea81 | Teflon Seal..Quick Connect..Puritan Bennett C-1000 | 3 | $360.00 | unmatched |
| part-sale-invoice / part-sale-item | P232 | 69e17d03afacc931bc12ea83 | Bezel..Puritan Bennett C-1000 | 5 | $765.05 | unmatched |
| part-sale-invoice / part-sale-item | P235 | 69e17d03afacc931bc12ea85 | Lens..Weight Scale..Puritan Bennett C-1000 | 15 | $2,128.00 | matched |
| part-sale-invoice / part-sale-item | P237 | 69e17d03afacc931bc12ea86 | O-Ring..Manifold..Puritan Bennett C-1000 | 5 | $301.85 | unmatched |
| part-sale-invoice / part-sale-item | P241 | 69e17d03afacc931bc12ea88 | Quick Connect..Bottom Only..Includes Teflon Seal..Puritan Bennett C-1000..Helios H850 | 3 | $577.80 | matched |
| part-sale-invoice / part-sale-item | P245 | 69e17d03afacc931bc12ea89 | Vent Valve..Puritan Bennett C-1000 | 1 | $722.25 | unmatched |
| part-sale-invoice / part-sale-item | P245U | 69e17d03afacc931bc12ea89 | Vent Valve..Puritan Bennett C-1000 | 5 | $2,717.02 | unmatched |
| part-sale-invoice / part-sale-item | P252 | 69e17d03afacc931bc12ea8a | Vent Lever..Puritan Bennett C-1000 | 4 | $360.40 | matched |
| part-sale-invoice / part-sale-item | P255 | 69e17d03afacc931bc12ea8c | Tubing..Vent Tube..Puritan Bennett C-1000 | 1 | $321.00 | unmatched |
| part-sale-invoice / part-sale-item | P256 | 69e17d03afacc931bc12ea8d | Caster..Single..60 MM or 3" | 4 | $840.00 | unmatched |
| part-sale-invoice / part-sale-item | P259 | 69e17d03afacc931bc12ea90 | Teflon Spacer..Vent Valve..Puritan Bennett C-1000 | 2 | $731.20 | unmatched |
| part-sale-invoice / part-sale-item | P260 | 69e17d03afacc931bc12ea91 | Pin..Vent Lever..Puritan Bennett C-1000 | 2 | $47.20 | unmatched |
| part-sale-invoice / part-sale-item | P261U | 69e17d03afacc931bc12ea92 | Bottle (USED)..Puritan Bennett C-1000 | 1 | $4,500.00 | matched |
| part-sale-invoice / part-sale-item | P275 | 69e17d03afacc931bc12ea9d | Contents Indicator Assembly..Includes Clear Lens, Body, Decal, Needle, Helix..Puritan Bennett C-1000/Companion T | 10 | $10,565.68 | unmatched |
| part-sale-invoice / part-sale-item | P281 | 69e17d03afacc931bc12eaa1 | Brass Tee..3/16" Tube | 1 | $423.80 | unmatched |
| part-sale-invoice / part-sale-item | P289 | 69e17d03afacc931bc12eaa8 | Tubing..Warming Coil..Puritan Bennett C-1000 | 1 | $790.08 | unmatched |
| part-sale-invoice / part-sale-item | P295 | 69e17d03afacc931bc12eaac | Coil..Warming Coil #1..Puritan Bennett Companion T | 2 | $864.19 | unmatched |
| part-sale-invoice / part-sale-item | P299 | 69e17d03afacc931bc12eab0 | E-Clip..Puritan Bennett C-1000..QR Helios Stationary | 2 | $118.00 | unmatched |
| part-sale-invoice / part-sale-item | P302 | 69e17d03afacc931bc12eab1 | Decal..Bezel..Puritan Bennett 41/31/21 | 7 | $341.96 | matched |
| part-sale-invoice / part-sale-item | P303 | 69e17d03afacc931bc12eab2 | Decal..Window..Puritan Bennett 41/31/21 | 5 | $630.63 | matched |
| part-sale-invoice / part-sale-item | P304 | 69e17d03afacc931bc12eab3 | Decal..Shroud..Puritan Bennett 41/31/21 | 4 | $259.56 | matched |
| part-sale-invoice / part-sale-item | P305 | 69e17d03afacc931bc12eab4 | Relief Valve..Primary 22 PSI..Puritan Bennett 41/31/21..Helios Standard Stationary | 9 | $1,730.68 | matched |
| part-sale-invoice / part-sale-item | P306 | 69e17d03afacc931bc12eab5 | Relief Valve..Secondary 30 PSI..Puritan Bennett 41/31/21..Helios Universal Stationary..Caire Liberator | 3 | $706.40 | unmatched |
| part-sale-invoice / part-sale-item | P307 | 69e17d03afacc931bc12eab6 | Humidifier Adapter..Puritan Bennett 41/31/21 | 1 | $559.25 | unmatched |
| part-sale-invoice / part-sale-item | P308 | 69e17d03afacc931bc12eab7 | Quick Connect..Male..Puritan Bennett 41/31/21..Helios Stationary | 4 | $1,836.12 | unmatched |
| part-sale-invoice / part-sale-item | P310 | 69e17d03afacc931bc12eab9 | Vent Key Wrench..Puritan Bennett | 4 | $222.53 | unmatched |
| part-sale-invoice / part-sale-item | P311U | 69e17d03afacc931bc12eaba | Vent Valve Assembly..Puritan Bennett 41/31/21 | 1 | $1,123.60 | unmatched |
| part-sale-invoice / part-sale-item | P317 | 69e17d03afacc931bc12eac0 | Bottle Bracket..Puritan Bennett 41/31/21 | 1 | $88.35 | matched |
| part-sale-invoice / part-sale-item | P318 | 69e17d03afacc931bc12eac1 | Relief Economizer Valve | 1 | $350.58 | matched |
| part-sale-invoice / part-sale-item | P321 | 69e17d03afacc931bc12eac4 | Contents Gauge..Puritan Bennett 41A | 13 | $14,230.86 | matched |
| part-sale-invoice / part-sale-item | P322 | 69e17d03afacc931bc12eac5 | Contents Gauge..Puritan Bennett 31A | 1 | $153.02 | unmatched |
| part-sale-invoice / part-sale-item | P323 | 69e17d03afacc931bc12eac6 | Contents Gauge..Puritan Bennett 21A | 2 | $1,224.16 | matched |
| part-sale-invoice / part-sale-item | P325 | 69e17d03afacc931bc12eac8 | Contents Gauge Bottom | 9 | $8,861.44 | unmatched |
| part-sale-invoice / part-sale-item | P326 | 69e17d03afacc931bc12eac9 | Contents Gauge Top | 7 | $9,824.64 | unmatched |
| part-sale-invoice / part-sale-item | P328U | 69e17d03afacc931bc12eaca | Shroud..Puritan Bennett 41/31/21 | 1 | $252.00 | unmatched |
| part-sale-invoice / part-sale-item | P330 | 69e17d03afacc931bc12eacc | Bezel..Puritan Bennett 41/31/21 | 10 | $2,706.77 | matched |
| part-sale-invoice / part-sale-item | P332 | 69e17d03afacc931bc12eace | Screw..Bezel..Puritan Bennett 41/31/21 | 1 | $88.50 | matched |
| part-sale-invoice / part-sale-item | P336 | 69e17d03afacc931bc12ead2 | O-Ring..Manifold..Puritan Bennett 41/31/21 | 1 | $52.25 | unmatched |
| part-sale-invoice / part-sale-item | P345 | 69e17d03afacc931bc12ead7 | Rubber Elbow..Drain Tube..Puritan Bennett 41/31/21 | 3 | $665.00 | matched |
| part-sale-invoice / part-sale-item | P347 | 69e17d03afacc931bc12ead8 | Drain Bottle | 4 | $596.55 | unmatched |
| part-sale-invoice / part-sale-item | P348 | 69e17d03afacc931bc12ebe8 | Drain Bottle Kit | 3 | $1,485.00 | matched |
| part-sale-invoice / part-sale-item | P363 | 69e17d03afacc931bc12eae2 | Pin - Long..Quick Release..Puritan Bennett 41/31/21 | 2 | $283.20 | matched |
| part-sale-invoice / part-sale-item | P365 | 69e17d03afacc931bc12eae4 | QR Knob..Puritan Bennett 41/31/21 | 5 | $1,012.22 | unmatched |
| part-sale-invoice / part-sale-item | P390U | 6a0dd840b3d67d5f05db4795 | Roller Base (USED) Only Available as Used | 1 | $900.00 | unmatched |
| part-sale-invoice / part-sale-item | P399 | 69e17d03afacc931bc12eae9 | Gauge Nipple..White Teflon | 6 | $614.78 | unmatched |
| part-sale-invoice / part-sale-item | P410 | 69e17d03afacc931bc12eaf3 | Aluminum Hose Barb..Helios H300/H850 | 2 | $294.25 | unmatched |
| part-sale-invoice / part-sale-item | P413 | 69e17d03afacc931bc12eaf6 | Bag..Hip Pack..Helios 300 | 1 | $325.00 | unmatched |
| part-sale-invoice / part-sale-item | P442U | 69e17d03afacc931bc12eb07 | Valve Conserver Assembly..Helios H300 | 1 | $500.00 | unmatched |
| part-sale-invoice / part-sale-item | P448 | 69e17d03afacc931bc12eb0c | Silicone Tubing..1/16" X 3"..Helios H300/H850 | 1 | $230.00 | unmatched |
| part-sale-invoice / part-sale-item | P462 | 69e17d03afacc931bc12eb14 | Knob..Helios H850 | 1 | $70.25 | unmatched |
| part-sale-invoice / part-sale-item | P463 | 69e17d03afacc931bc12eb15 | Valve Conserver Assembly..Helios H850 | 1 | $761.34 | unmatched |
| part-sale-invoice / part-sale-item | P513 | 69e17d03afacc931bc12eb2a | Decal..Oxygen Outlet..Helios Stationary | 2 | $28.84 | unmatched |
| part-sale-invoice / part-sale-item | P521 | 69e17d03afacc931bc12eb2f | Contents Gauge..Helios Stationary | 2 | $494.34 | unmatched |
| part-sale-invoice / part-sale-item | P521U | 69e17d03afacc931bc12eb2f | Contents Gauge..Helios Stationary | 3 | $1,071.07 | unmatched |
| part-sale-invoice / part-sale-item | P529 | 69e17d03afacc931bc12eb34 | Black Tubing..1/16" X 12"..Helios H300..Helios Stationary | 1 | $95.90 | unmatched |
| part-sale-invoice / part-sale-item | P530 | 69e17d03afacc931bc12eb35 | Brass Barb Fitting..Small - 1/16"..Helios H300/H850..Helios Stationary | 1 | $23.60 | unmatched |
| part-sale-invoice / part-sale-item | P531 | 69e17d03afacc931bc12eb36 | Brass Barb Fitting..Large - 1/8"..Helios H300/H850 | 1 | $23.60 | unmatched |
| part-sale-invoice / part-sale-item | P540 | 69e17d03afacc931bc12eb3e | Economizer Valve..Helios Universal..24 PSI | 1 | $430.56 | unmatched |
| part-sale-invoice / part-sale-item | P553 | 69e17d03afacc931bc12eb4a | Pressure Gauge..Helios Standard | 2 | $287.42 | unmatched |
| part-sale-invoice / part-sale-item | P554 | 69e17d03afacc931bc12eb4b | Pressure Gauge Lens..Helios Standard | 3 | $408.24 | unmatched |
| part-sale-invoice / part-sale-item | P601 | 69e17d03afacc931bc12eb54 | Male Nut..Caire Stroller | 2 | $47.74 | unmatched |
| part-sale-invoice / part-sale-item | P603 | 69e17d03afacc931bc12eb56 | Decal..Bottom Decal..Caire | 13 | $997.04 | unmatched |
| part-sale-invoice / part-sale-item | P605 | 69e17d03afacc931bc12eb58 | Decal..Stroller..Caire | 11 | $741.60 | unmatched |
| part-sale-invoice / part-sale-item | P609 | 69e17d03afacc931bc12eb5c | Shroud..Caire Liberator | 1 | $318.00 | unmatched |
| part-sale-invoice / part-sale-item | P612 | 69e17d03afacc931bc12eb5e | Strap..Caire Stroller | 4 | $1,560.90 | unmatched |
| part-sale-invoice / part-sale-item | P614 | 69e17d03afacc931bc12eb60 | Relief Valve..Primary With O-Ring..23 PSI..Caire Stroller | 1 | $151.45 | unmatched |
| part-sale-invoice / part-sale-item | P618 | 69e17d03afacc931bc12eb63 | Drain Tube - Not Including Rivet..Caire Liberator | 1 | $96.50 | unmatched |
| part-sale-invoice / part-sale-item | P620 | 69e17d03afacc931bc12ebe9 | Drain Bottle Kit..Caire Liberator | 1 | $330.00 | unmatched |
| part-sale-invoice / part-sale-item | P631 | 69e17d03afacc931bc12eb6f | Quick Connect..Male..Puritan Bennett - Posi Lock | 1 | $188.32 | unmatched |
| part-sale-invoice / part-sale-item | P634 | 69e17d03afacc931bc12eb72 | Meter..Caire | 4 | $3,404.00 | unmatched |
| part-sale-invoice / part-sale-item | P640 | 69e17d03afacc931bc12eb78 | Fill Tube..Caire Stroller | 2 | $457.50 | unmatched |
| part-sale-invoice / part-sale-item | P643 | 69e17d03afacc931bc12eb7b | Tubing..Primary..Caire Stroller | 3 | $241.57 | unmatched |
| part-sale-invoice / part-sale-item | P645 | 69e17d03afacc931bc12eb7d | Decal..Hi Flow..Caire | 3 | $600.00 | unmatched |
| part-sale-invoice / part-sale-item | P652 | 69e17d03afacc931bc12eb84 | Coil Assembly..Caire Stroller..Bottom Inlet | 5 | $1,414.95 | unmatched |
| part-sale-invoice / part-sale-item | P654 | 69e17d03afacc931bc12eb86 | Sleeve..Quick Release..Caire Liberator | 1 | $110.30 | unmatched |
| part-sale-invoice / part-sale-item | P662 | 69e17d03afacc931bc12eb8a | Relief Valve..Primary 20 PSI..Caire Stroller | 5 | $3,096.00 | unmatched |
| part-sale-invoice / part-sale-item | P671 | 69e17d03afacc931bc12eb92 | Vent Key Wrench..Caire Liberator | 3 | $187.50 | unmatched |
| part-sale-invoice / part-sale-item | P675 | 69e17d03afacc931bc12eb95 | Nomex Pad..Caire Stroller | 5 | $856.00 | unmatched |
| part-sale-invoice / part-sale-item | P682 | 69e17d03afacc931bc12eb9b | Plug..Plastic..Caire Stroller | 9 | $963.00 | unmatched |
| part-sale-invoice / part-sale-item | P684 | 69e17d03afacc931bc12eb9d | Harness Assy..Feed Through..Caire Liberator | 1 | $758.40 | matched |
| part-sale-invoice / part-sale-item | P687 | 69e17d03afacc931bc12eba0 | Side Cover..Wide..Caire Stroller | 15 | $6,331.52 | unmatched |
| part-sale-invoice / part-sale-item | P688 | 69e17d03afacc931bc12eba1 | Blue Dome..With Opening..Caire Stroller | 11 | $933.75 | unmatched |
| part-sale-invoice / part-sale-item | P689 | 69e17d03afacc931bc12eba2 | Black Leather Case..Top Fill | 2 | $1,378.80 | unmatched |
| part-sale-invoice / part-sale-item | P693 | 69e17d03afacc931bc12eba6 | Top Cover..Wide..Caire Stroller | 2 | $127.60 | unmatched |
| part-sale-invoice / part-sale-item | P694 | 69e17d03afacc931bc12eba7 | Condensation Cup..Caire Stroller | 1 | $87.50 | unmatched |
| part-sale-invoice / part-sale-item | P695 | 69e17d03afacc931bc12eba8 | Grommet..Condensation Cup..Caire Stroller | 2 | $88.50 | unmatched |
| part-sale-invoice / part-sale-item | P696 | 69e17d03afacc931bc12eba9 | Plunger..Condensation Cup..Caire Stroller | 2 | $120.00 | unmatched |
| part-sale-invoice / part-sale-item | P709 | 6a0b5121856f4b5532085b9e | Transfer Line..Oxygen..4 Foot..1/2" With Full Armor..Brass Nuts | 3 | $511.50 | unmatched |
| part-sale-invoice / part-sale-item | P709-SS | 6a4663475bb319f96a38fa5f | Transfer Line..Oxygen 4 Foot 1/2" With Full Armor SS Nuts | 1 | $381.00 | unmatched |
| part-sale-invoice / part-sale-item | P710 | 6a1884d4f83594ef99bac272 | Transfer Line Oxygen 6 Foot 1/2" With Full Armor Brass Nuts | 5 | $1,417.50 | unmatched |
| part-sale-invoice / part-sale-item | P711 | 6a0363c401186a2594c0d874 | Transfer Line..Oxygen..8 Foot..1/2" With Full Armor..Brass Nuts | 4 | $2,510.75 | unmatched |
| part-sale-invoice / part-sale-item | P711-LN2 | 6a79cf959c847523c1812e26 | Transfer Line Nitrogen 8 Foot..1/2" With Full Armor Brass Nuts | 1 | $238.25 | unmatched |
| part-sale-invoice / part-sale-item | P712 | 6a03641e01186a2594c0d8d8 | Transfer Line..Oxygen..10 Foot..1/2" With Full Armor..Brass Nuts | 1 | $254.70 | unmatched |
| part-sale-invoice / part-sale-item | P712-SS | 6a4fa98e0e09580b67802b3e | Transfer Line..Oxygen 10 Foot 1/2" With Full Armor SS Nuts | 1 | $794.10 | unmatched |
| part-sale-invoice / part-sale-item | P713 | 6a75e9199c847523c180a6c9 | Transfer Line..Oxygen..12 Foot..1/2" With Full Armor..Brass Nuts | 1 | $840.75 | unmatched |
| part-sale-invoice / part-sale-item | P714 | 6a15d111a7ce5b3352f36ea5 | Fill Head..Dual..Puritan Bennett and Caire | 3 | $5,305.86 | unmatched |
| part-sale-invoice / part-sale-item | P715 | 6a2c2c38d4f6f954e205fc0d | Fill Head Puritan Bennett | 4 | $5,250.00 | unmatched |
| part-sale-invoice / part-sale-item | P717 | 6a303c18132725747b2c7fe4 | Transfer Line Oxygen 15 Foot 1/2" With Full Armor Brass Nuts | 1 | $1,581.25 | unmatched |
| part-sale-invoice / part-sale-item | P719 | 6a0606e9ed526650d38de638 | Transfer Line Adapter..5/8" Male Flare X 5/8" Male Flare..Parker PN - 42F-10 | 2 | $173.40 | matched |
| part-sale-invoice / part-sale-item | P720 | 6a79cf389c847523c1812d2d | Source Adapter | 2 | $670.00 | unmatched |
| part-sale-invoice / part-sale-item | P721 | 6a2c2cb9d4f6f954e205fcf7 | Reducer Assembly 1" Female X 5/8" Male | 1 | $1,125.00 | unmatched |
| part-sale-invoice / part-sale-item | P727 | 6a15d20ca7ce5b3352f36fbf | Gauge Assembly..Includes: P724 - Gauge P722 - Reducer P213 - Hose Barb | 2 | $216.72 | unmatched |
| part-sale-invoice / part-sale-item | P729 | 6a7f40f4c724b5ba605f8879 | Adapter 5/8" Male Flare X 3/4" Male NPT | 1 | $199.70 | unmatched |
| part-sale-invoice / part-sale-item | P729-90 | 6a7f4152c724b5ba605f8943 | Adapter 5/8" Male Flare X 3/4" Male NPT 90 Degree Elbow | 1 | $80.91 | unmatched |
| part-sale-invoice / part-sale-item | P738 | 69e17d03afacc931bc12ebb6 | Screw..Bottom Case..Caire Stroller | 2 | $120.80 | unmatched |
| part-sale-invoice / part-sale-item | P747 | 6a2c2d00d4f6f954e205fd84 | Adapter 1" Male Flare X 1" Male NPT | 1 | $872.40 | unmatched |
| part-sale-invoice / part-sale-item | P750 | 69e17d03afacc931bc12ebba | Lip Seal..Rubber | 2 | $433.62 | unmatched |
| part-sale-invoice / part-sale-item | P751 | 69e17d03afacc931bc12ebbb | Lip Seal..Metal | 36 | $11,920.92 | matched |
| part-sale-invoice / part-sale-item | P761 | 6a15d4cba7ce5b3352f372d1 | Transfer Line Oxygen 10 Foot 1" With Full Armor Brass Nuts | 1 | $1,310.97 | unmatched |
| part-sale-invoice / part-sale-item | P773 | 6a2864e051a3bf6e43f131da | Transfer Line Oxygen 12 Foot 1" With Full Armor Brass Nuts | 1 | $998.00 | unmatched |
| part-sale-invoice / part-sale-item | P798 | 6a0487da37a608a5a0a3982c | In-Line Swivel Assembly | 6 | $3,035.89 | matched |
| part-sale-invoice / part-sale-item | P799 | 69e17d03afacc931bc12ebc1 | Bottle Bracket..Caire Liberator | 2 | $527.50 | unmatched |
| part-sale-invoice / part-sale-item | P801 | 69e17d03afacc931bc12ebc2 | FCV..1/4 - 6 LPM..22 PSI..Puritan Bennett C-1000 | 2 | $481.50 | matched |
| part-sale-invoice / part-sale-item | P809 | 69e17d03afacc931bc12ebc3 | FCV..1/4 - 6 LPM..19.5 PSI..Puritan Bennett Stationary | 3 | $2,193.50 | unmatched |
| part-sale-invoice / part-sale-item | P810 | 69e17d03afacc931bc12ebc4 | FCV..1/2 - 10 LPM..19.5 PSI..Puritan Bennett Stationary | 1 | $1,070.00 | unmatched |
| part-sale-invoice / part-sale-item | P818 | 69e17d03afacc931bc12ebc5 | FCV w/ Knob, Plate, and Dial..0 - 10 LPM..External With Fittings..Helios Stationary | 1 | $694.50 | unmatched |
| part-sale-invoice / part-sale-item | P821 | 69e17d03afacc931bc12ebc8 | FCV - Side Inlet..0-15 LPM..16 Position..Caire Liberator | 1 | $497.25 | unmatched |
| part-sale-invoice / part-sale-item | P822 | 69e17d03afacc931bc12ebc9 | Dial..16 Position..0-15 LPM..Caire | 1 | $337.50 | unmatched |
| part-sale-invoice / part-sale-item | P823 | 69e17d03afacc931bc12ebca | Locking Plate..Metal..16 Position..Caire | 1 | $137.70 | unmatched |
| part-sale-invoice / part-sale-item | P849 | 69e17d03afacc931bc12ebd0 | Dial..1/2-15..Puritan Bennett | 2 | $96.00 | unmatched |
| part-sale-invoice / part-sale-item | P851 | 69e17d03afacc931bc12ebd2 | Dial..1/4-6..Puritan Bennett | 7 | $499.20 | unmatched |
| part-sale-invoice / part-sale-item | P852 | 69e17d03afacc931bc12ebd3 | Dial..1/2-10..Puritan Bennett | 1 | $76.80 | unmatched |
| part-sale-invoice / part-sale-item | P853 | 69e17d03afacc931bc12ebd4 | FCV..0 - 15 LPM..22 PSI..Puritan Bennett Companion T | 2 | $1,979.50 | unmatched |
| part-sale-invoice / part-sale-item | P860 | 69e17d03afacc931bc12ebd5 | Knob..Grey..Puritan Bennett | 9 | $12,115.20 | matched |
| part-sale-invoice / part-sale-item | P861 | 69e17d03afacc931bc12ebd6 | Locking Plate..Grey..Puritan Bennett | 7 | $556.80 | unmatched |
| part-sale-invoice / part-sale-item | P866 | 69e17d03afacc931bc12ebd8 | Dial..1/4-6..Caire | 1 | $76.80 | unmatched |
| part-sale-invoice / part-sale-item | P881 | 69e17d03afacc931bc12ebe0 | Locking Plate..Caire - Black..12 Position | 2 | $115.20 | unmatched |
| part-sale-invoice / part-sale-item | P882 | 69e17d03afacc931bc12ebe1 | Knob..Red - Small..Caire Stroller | 1 | $74.60 | unmatched |
| part-sale-invoice / part-sale-item | P992 | 6a79c78b9c847523c181190c | Relief Valve 150 PSI 1/4" NPT | 2 | $481.95 | unmatched |
| part-sale-invoice / part-sale-item | PC101 | 6a17329cab01c63a94fa8811 | Decal Perfecto2 Black Shield | 4 | $1,961.25 | unmatched |
| part-sale-invoice / part-sale-item | PC102 | 69fde843986fc03193f58767 | Decal Perfecto2 V Blue Shield | 7 | $2,755.20 | unmatched |
| part-sale-invoice / part-sale-item | PC104-2 | 6a22cee380153fcb39b73dcb | Decal Black Shield 2 Holes Concentrator | 1 | $236.00 | unmatched |
| part-sale-invoice / part-sale-item | PC105 | 6a0b09caeeb45c0143075bbf | Decal..Warning..Concentrator | 2 | $335.00 | unmatched |
| part-sale-invoice / shipping-income | (none) | (none) | Explicit shipping | 178 | $14,680.62 | matched |
| repair-invoice / equipment-sales | P110 | (none) | Equipment-classified unit; serial omitted | 34 | $13,310.00 | matched |
| repair-invoice / equipment-sales | P111 | (none) | Equipment-classified unit; serial omitted | 20 | $12,875.00 | matched |
| repair-invoice / equipment-sales | P112 | (none) | Equipment-classified unit; serial omitted | 4 | $2,100.00 | matched |
| repair-invoice / repair-revenue | LRCP230 | (none) | Repair-classified service; serial omitted | 297 | $67,390.00 | matched |
| repair-invoice / repair-revenue | LRP190 | (none) | Repair-classified service; serial omitted | 908 | $168,720.00 | matched |
| repair-invoice / repair-revenue | LRS190 | (none) | Repair-classified service; serial omitted | 526 | $93,100.00 | matched |
| repair-invoice / repair-revenue | NRP285 | (none) | Repair-classified service; serial omitted | 124 | $31,720.00 | matched |
| repair-invoice / repair-revenue | P900 | (none) | Liquid Test service; Liquid Test service (warranty) | 9 | $84.00 | matched |
| repair-invoice / repair-revenue | P900-V | (none) | Liquid Test service | 18 | $1,059.30 | matched |
| repair-invoice / repair-revenue | P975 | (none) | Revac service; Revac service (warranty) | 4 | $116.00 | matched |
| repair-invoice / repair-revenue | P975-V | (none) | Repair-classified service; serial omitted; Revac service | 18 | $3,245.87 | matched |
| repair-invoice / repair-revenue | P985 | (none) | Repair-classified service; serial omitted | 5 | $408.00 | matched |
| repair-invoice / repair-revenue | Repair | (none) | Repair-classified service; serial omitted | 447 | $94,541.37 | matched |
| repair-invoice / shipping-income | (none) | (none) | Explicit shipping | 38 | $16,655.12 | matched |
| standalone-invoice / shipping-income | (none) | (none) | Explicit shipping | 3 | $2,766.70 | matched |
| standalone-invoice / standalone-item | (none) | (none) | Shipping described item | 2 | $1,726.79 | unmatched |
| standalone-invoice / standalone-item | P201 | 69e17d03afacc931bc12ea67 | Side Cover..Side A..Puritan Bennett C-1000 | 1 | $1,793.00 | matched |
| standalone-invoice / standalone-item | P728 | 6a79e6419c847523c1816065 | Pressure Gauge 2.5" 400 PSI 1/4" Bottom Inlet | 1 | $58.17 | unmatched |
| standalone-invoice / standalone-item | P900 | 69f9fdbcd4b7efe64077058b | Liquid Test service | 1 | $58.85 | unmatched |
| standalone-invoice / standalone-item | P900-V | 6a3a9c56bb6ccdd834ed2ede | Liquid Test service | 1 | $58.85 | unmatched |
| standalone-invoice / standalone-item | P950 | 69f9fd93d4b7efe640770570 | Labor and supplies / tank-work service; operational details omitted | 5 | $20,324.19 | unmatched |
| standalone-invoice / standalone-item | P950-I | 6a0b6404856f4b5532087dbd | Labor/supplies and vessel-inspection service; bundled parts/labor | 2 | $8,737.65 | unmatched |
| standalone-invoice / standalone-item | P950-V | 6a2ad71cee706d8c5ae2e9dc | Labor and supplies / tank-work service; operational details omitted | 14 | $13,917.05 | unmatched |
| standalone-invoice / standalone-item | P975 | 69e17d03afacc931bc12ebe3 | Revac service | 1 | $331.02 | unmatched |
| standalone-invoice / standalone-item | P975-V | 6a2ad818ee706d8c5ae2eb68 | Revac service | 2 | $353.10 | unmatched |
| standalone-invoice / standalone-item | Repair | 6a03458801186a2594c0c89f | [free text withheld; review source] | 12 | $30,659.36 | unmatched |
| standalone-invoice / standalone-item | Shipping | 6a6212d9ac39c3a17ee0039e | Shipping described item | 2 | $1,127.91 | unmatched |
| standalone-invoice / standalone-item | T9022 | 6a7c9a3d4fbfa8319802b4ba | Cryogenic Economizer 300 PSI Combination Pressure Builder/Economizer 1/4" FNPT X 3 | 1 | $350.00 | unmatched |

Only this documentation report was created. No database writes, mapping installation, invoice import, posting, configuration changes, migrations, production access or service restarts occurred. Existing work was preserved.

## Exception review and final business decisions — October 12, 2026

**This section supersedes the earlier unresolved-item discussion and installation recommendation, but preserves the original coverage tables and the user's approval of the 39-rule baseline. Nothing is installed.**

### Evidence and scope

Repeated the entire approved period through unchanged `scanInvoices()` and strict v1 validation: 13 complete windows, 17 authenticated GETs, the same monthly invoice counts (444 total), and no retrieval failures. Inspected ERP exporter/loader, standalone model and form, price creation paths, repair workflow and catalog. Used native-driver reads only against the two known development databases; no models, index initialization, login/session persistence, application mutation routes or accounting services were invoked.

ERP access passed its unchanged `developmentPolicy.approveMongoUri` using the protected credential fingerprint, then MongoDB hello confirmed `127.0.0.1:27119/equipment_tracker_dev`, replica set `cfoFixture`. Financial Agent's exact approved URI and development flag were checked; hello confirmed port 27291 / `financialagent_dev` / `financialagent-dev`. No safety guard was bypassed. Customer names, operational free text, serial numbers and credentials are omitted. Catalog observations are current evidence, not proof of historical transaction terms.

All 163 distinct non-null part IDs in the coverage inventory resolved to current catalog records. Current 1100 is active, company-owned Asset/control, manual posting disabled; 4100/4200/4300/4400 are active company-owned Revenue accounts. Posting eligibility remains valid under the existing missing-field/default semantics; 4400 explicitly has postingAccount=true. No new account was created. The earlier persisted 1010 selection must still be replaced with the explicitly approved 1100 at a separately authorized installation.

### 1. Anonymous freight: exact identities and cause

Both lines have sourceType `standalone-invoice`, sourceLineId `line:0`, positional identity, and mappingKey `standalone-item`.

| Reference | Invoice date | ERP standalone document ID | Exact exported sourceId | Unmatched line value | Other shipping on this invoice |
| --- | --- | --- | --- | --- | --- |
| F1 | 2026-05-21 | `6a0f305551594cd711a05c13` | `5b88de8667a08bf92b9868c8ad9805214f0ebb9256649eb3fe09af43820a384e` | $0.00 | $767.19 header charge, exported separately as `shipping` and already mapped |
| F2 | 2026-05-29 | `6a199c092c2ea5a34a57b01b` | `bd7ef605fa42aecbba4971c3efcf9a7354a4fb91d6d669bdb442cb17342732ee` | $1,726.79 | $0.00 |

**Correction to the shorthand “two freight lines totaling $1,726.79”: only F2 carries that money. F1 is a zero-value placeholder.** F1 subtotal is $0.00 and total $767.19; F2 subtotal and total are $1,726.79. Both reconcile.

Stored lines have partId=null, itemName="", and no item or partNumber. Their descriptions refer to shipping; F2 specifically describes inbound shipping. Quantities are 1, with unit price/line total respectively $0.00 and $1,726.79. There is no hidden catalog identifier being dropped by the exporter. The source model explicitly permits free-text lines with null partId and empty itemName; thus these are representable ERP transactions with missing mapping metadata, not malformed invoice amounts.

ERP `src/lib/financialAgentInvoiceData.ts` reads these identity fields unchanged. `financialAgentInvoices.ts` selects item/partNumber/itemName; empty text becomes null. All ordinary standalone lines retain standalone-item; only a separate nonzero shippingCharge becomes shipping-income. Financial Agent intentionally has no description or invoice-ID mapping selector and requires an exact item identity for standalone-item. This is a source classification/identity gap exposed by the integration's deliberate limitations, not grounds for a generic freight fallback.

**Smallest proposed correction, separately authorized and source-owned:** have the ERP business owner verify the two charges and, if correct, associate each existing line with the established Shipping catalog item `6a6212d9ac39c3a17ee0039e` / itemName `Shipping`, preserving every amount, quantity, header charge and line position. F1 must remain zero; never add its $767.19 twice. If a zero informational placeholder should not be a catalog charge, retain it on hold and design an explicit source representation instead—do not discard it silently. The existing exact Shipping selector can then classify the records once its account policy is approved. No v1 schema weakening, fabricated identity or description-based catch-all is recommended. Such a source correction changes sourceRevision and requires a fresh complete scan; no correction was performed.

### 2. Commercial classification findings

The full per-item occurrence/value inventory above remains the reference for all 79 new exact candidates. Each of the 72 new part-sale identities was compared with its current catalog record and source description. Seventy-one are identifiable replacement components/accessories; P992 has the account-policy conflict below. Inventory/service labels alone were not treated as proof of transaction meaning.

P985 is now resolved: catalog `69e17d03afacc931bc12ebe4` says **“Weld Repair..Includes Revac”**, partType=service, salesAccountKey=income:repair_income. `repairWorkflow.ts:getRevacInvoiceParts` chooses P985 for the weld-repair outcome; `bottleReview.ts` and `bottleReplacement.ts` independently distinguish Weld Repair from Revac. Its five repair lines ($408.00: four $102.00 lines and one $0.00 line) fit 4100 under existing H02; no extra rule is needed. This is not a parts-prefix inference.

| Identifier / source context | Description / evidence | Lines | Line value | Proposed account | Status / exact unresolved question |
| --- | --- | --- | --- | --- | --- |
| P985, repair | Weld Repair including Revac; catalog and workflow agree | 5 | $408.00 | 4100 | Supported service classification; no remaining account question |
| P900, standalone | Liquid Test; catalog service / repair_income | 1 | $58.85 | 4100 | Supported; testing charge, not liquid commodity |
| P900-V, standalone | Liquid Test; catalog service / repair_income | 1 | $58.85 | 4100 | Supported |
| P975, standalone | Revac; catalog service / repair_income | 1 | $331.02 | 4100 | Supported service; no assertion about an undocumented technical procedure |
| P975-V, standalone | Revac; catalog service / repair_income | 2 | $353.10 | 4100 | Supported |
| P950, standalone | Labor and Supplies; catalog service / repair_income | 5 | $20,324.19 | 4100 | Supported bundled service, consistent with historical P950-V policy |
| P950-I, standalone | Labor and Supplies / Parts replaced; catalog service / repair_income | 2 | $8,737.65 | 4100 | Supported bundled service under current catalog policy; no invented split of parts/labor. Any desired unbundling needs a separate business policy and source allocation |
| P110, repair | C-1000 refurbished; equipment_income; exporter uses pioneer_resale billingProgram | 34 | $13,310.00 | 4300 | Supports approved equipment rule; catalog partType=service does not override explicit resale evidence |
| P111, repair | Companion T refurbished; same resale evidence | 20 | $12,875.00 | 4300 | Supports approved equipment rule |
| P112, repair | Refurbished 41/31/21; same resale evidence | 4 | $2,100.00 | 4300 | Supports approved equipment rule |
| P261U, part-sale | Bottle (USED), inventory P261; no stored salesAccountKey | 1 | $4,500.00 | 4200 | Preserve approved N04. Replacement bottle evidence supports component treatment; catalog alone does not prove title, exchange, deposit or core-credit terms |
| P347, part-sale | Drain Bottle, inventory / parts_income | 4 | $596.55 | 4200 | Supported accessory, not complete cryogenic equipment |
| P620, part-sale | Drain Bottle Kit, inventory / parts_income | 1 | $330.00 | 4200 | Supported accessory |
| P799, part-sale | Bottle Bracket, inventory / parts_income | 2 | $527.50 | 4200 | Supported component |
| Shipping, standalone | Inbound Shipping; catalog service but other_income | 2 | $1,127.91 | 4400 | **Hold:** is billed inbound freight ordinary Shipping Revenue, or should this catalog's Other Income distinction be retained? |
| P992, part-sale | Relief valve 150 PSI 1/4 NPT; inventory but truck_income | 2 | $481.95 | 4200 candidate | **Hold:** consolidate truck-component sales into Parts, or retain a separate truck-income category? |
| P711-LN2, part-sale (H55) | Nitrogen transfer line; inventory / truck_income | 1 | $238.25 | 4200 historical | Same truck-income decision |
| P729, part-sale (H60) | Adapter; inventory / truck_income | 1 | $199.70 | 4200 historical | Same truck-income decision |
| P729-90, part-sale (H61) | 90-degree adapter; inventory / truck_income | 1 | $80.91 | 4200 historical | Same truck-income decision |
| P728, standalone (H71) | Pressure gauge; inventory / truck_income | 1 | $58.17 | 4200 historical | Same truck-income decision |
| T9022, standalone (H74) | Cryogenic pressure builder/economizer; inventory / truck_income | 1 | $350.00 | 4200 historical | Same truck-income decision |

Five truck selectors were explicitly documented as 4200 in September; the sixth, P992, is new. This is a genuine difference between current producer catalog segmentation and documented consumer account policy, not proof either is erroneous. Current evidence cannot date the catalog setting or explain the prior consolidation decision. Do not silently resurrect these five historical choices.

New used-reference variants P245U, P311U, P328U, P390U, P442U and P521U refer to vent valves, shroud, roller base, conserver assembly and gauge, respectively. Catalog identities/descriptions and parts_income support 4200. Their individual counts/values remain in the inventory above. The exporter omits isUsed, and a U suffix alone does not establish exchange, rental or deposit treatment. Shared IDs P245/P245U and P521/P521U remain separated by exact reference AND partId. No observed negative lines, credit/return classifications or explicit rental/deposit items establish a new rule for those transaction types; null discount headers are not proof discounts never occurred.

Missing catalog salesAccountKey on P216/P261/P321/P322/P323/P448 does not imply a non-revenue category. Component descriptions support their proposed Parts classification; no catalog default was used as sole evidence. Account 4400 already provides freight income. No new account is necessary for supported classifications; a business decision to preserve truck/other-income segmentation could require a separate active Revenue account or approved chart crosswalk.

### 3. Quantity/price exceptions: precision limitation, not missing prices

Both invoices are embedded in partsales document `6a0dfba422169580f8d6edb0`, sourceLineId `line:0`, P201 / partId `69e17d03afacc931bc12ea67`.

| Invoice date | Exact exported sourceId | Quantity | Stored numeric unit price | Rounded extension = subtotal = total |
| --- | --- | --- | --- | --- |
| 2026-06-22 | `4a80c819407776c65393408feb794f5ec424168a813e8438038c55c336693a46` | 66 | $17.5133 | $1,155.88 |
| 2026-07-14 | `261c0c64deff8d3aad1e895b4e10cd385f22b8e238c86f6bb87659592b8c8b0f` | 334 | $17.5133 | $5,849.44 |

Each has one line, zero shipping and no header/line-sum discrepancy. The exact pre-round products are $1,155.8778 and $5,849.4422. ERP's invoice creation path `src/app/api/part-sales/[id]/invoice/route.ts` preserves numeric unitPrice and rounds the extended line total; `priceFormat.ts` supports up to six displayed decimals. This is expected fractional-unit-price behavior in these source records.

`financialAgentInvoices.ts:financialCents` deliberately rejects real fractional cents. Consequently $17.5133 becomes unitPriceCents=null and raises invalid-line-quantity-or-price. Quantity is valid; unit price is neither absent nor nonnumeric. Existing producer tests explicitly reject fractional-cent inputs. The v1 integer-cent unit-price representation cannot faithfully express these prices, and consumer readiness correctly fails closed.

Classification remains P201 -> 4200. Known invoice valuations total **$7,005.32** and reconcile, but the consumer cannot independently validate quantity × exact unit price through v1. Do not round the unit price to $17.51, fabricate quantity, change source totals, or dismiss the flag. Keep both invoices on hold before authoritative accounting. A separately approved producer/consumer precision design must preserve the source rate and documented extension-rounding semantics; this investigation recommends no unilateral v1 change or validator bypass.

### 4. Rule validation and recommended batch

Reconstructed all 169 candidates in memory and ran the unchanged mappingSchema and resolveLine against all 183 observed identity tuples. **169 unique selector predicates, zero equal-precedence ambiguities.** There are three historical semantic classification rules (repair/equipment/shipping), 166 exact-item rules, no generic standalone/parts/unmapped rule, and no description fallback. Exact item rules take precedence over semantic defaults; all specified selectors are ANDed. No presently observed overlap changes a target account. Semantic defaults will also match future producer-classified records, so later windows still need review.

All 74 historical selectors remain schema-compatible; their account UUIDs must use today's company-owned accounts, not presumed September identifiers. Five historical selectors have the truck-income policy question above. The 169-rule scenario still covers **3,366 lines / $849,650.98**, leaving F1/F2 **2 lines / $1,726.79**. Mapping coverage is not posting readiness and includes the two price-flagged invoices.

**Recommended evidence-supported proposal: 162 rules, pending separate installation approval.**

- Preserve the approved 39-rule baseline, including intended AR 1100.
- Add **46** of the 51 deferred historical exact rules; hold H55, H60, H61, H71 and H74.
- Add **77** of the 79 new exact candidates: 71 component selectors and six standalone service selectors. Hold P992 and standalone Shipping.
- Specify the full sourceType + mappingKey + itemReference + partId predicates from the existing inventory; never broaden to partId-only rules for shared used/new catalog IDs.

Actual in-memory resolver coverage for this 162-rule subset: **3,357 lines / $847,114.09**, zero ambiguities. Held seven selectors account for **9 lines / $2,536.89**; together with F1/F2, unresolved coverage is **11 lines / $4,263.68**. This is a mapping proposal, not automatic approval of transactions or accounting recognition. Separate approval of the seven policies could restore the 169-rule proposal; fixing anonymous identities would then need a new complete coverage check.

### Final business-decision table

| Decision | Evidence-based recommendation | Required answer / owner | Effect before resolution |
| --- | --- | --- | --- |
| Six truck-income identities | Their products are components; 4200 is plausible but differs from producer segmentation | Accounting owner: intentionally consolidate truck components into Parts, or preserve truck revenue separately? | Hold six exact rules (five historical + P992); 7 lines / $1,408.98 |
| Identified inbound Shipping | 4400 is the existing appropriate freight-income candidate; never 4200/4100 or 6600 | Accounting owner: approve consolidation from ERP other_income to 4400, or require a separate revenue crosswalk? | Hold one exact rule; 2 lines / $1,127.91 |
| Anonymous freight F1/F2 | Preserve all values; attach a verified catalog identity only through a reviewed ERP source correction | ERP owner: confirm F2 inbound freight and F1 zero placeholder semantics; authorize a separate source correction if appropriate | 2 lines / $1,726.79 cannot resolve today, even with all 169 |
| Fractional-price invoices | Totals reconcile; preserve $17.5133 precision and current fail-closed gate | Integration/accounting owners: approve exact rate/rounding evidence design before authoritative use | Two invoices / $7,005.32 remain quality holds, independent of mapping |
| Bundled labor/supplies and P985 | 4100 agrees with catalog, workflow and historical service policy | No missing classification evidence; approve six new exact service selectors as part of the proposed batch. Any new unbundling policy is separate | No guessed allocation between labor and supplied parts |
| Resale equipment and used bottle | Retain current 39-rule approval; resale billingProgram/catalog and component descriptions support existing targets | If a particular transaction is actually a rental, exchange, deposit or return, accounting owner must identify it and provide terms; none was established here | Do not use catalog labels as proof of title or recognition timing |
| Installation | Consider the explicit 162-rule subset after review, with 1100 and current version/account revalidation | Separate mapping-installation authorization; separate later import authorization | No installation, import or posting performed |

Only this report was updated during the exception review. No source or Financial Agent records, mappings, balances, journals, configuration, services or other repository files were modified.

## Installed development configuration — October 12, 2026

**Final status: approved 169-rule configuration installed as mapping version 2. This section supersedes earlier proposal-only, held-classification and 162-rule installation recommendations. The source-data exceptions remain open. No invoices were imported.**

### Preflight and authorization

The user explicitly approved separate truck-tank revenue, standalone Shipping -> 4400, P985 -> 4100, P111/P112 -> 4300, P261U -> 4200, and AR 1100. Initial preflight stopped because 4500 was occupied. The user then confirmed they had created that account; the installation reused **4500 — Trucks**, ID `2b65226d-1cce-460b-a427-fdb02965787a`, without creating, renaming or editing an account. It is active, type Revenue, postingAccount=true, controlAccount=false, allowManualPosting=true, and company-owned. It was created by the user at 2026-10-12T18:37:33.035Z, before this installation.

Verified exact development URI, company binding, authoritative=false, authenticated local lifecycle controller and replica-set hello; the running HTTPS application also passed its development guard. Database: `financialagent_dev`, `127.0.0.1:27291`, replica set `financialagent-dev`. Existing unique account-code and mapping-version indexes were present. No migration or index initialization was run.

Backup `C:\Dev\financialagent\.local\backups\financialagent-dev\20261012T164114Z` remains available: all **24 SHA-256 checksum entries passed** (23 dump files plus manifest), and its manifest retains the previous successful isolated-restore verification. No restore was performed. This backup predates the user's 4500 creation and mapping version 2; it is a verified earlier baseline, not a post-install backup.

Full BSON-typed document fingerprints were captured across all 11 namespaces. They remained unchanged through repeated preflight checks, supported development login and authenticated AR overview, immediately before mutation. The application received expectedVersion=1 and atomically enforced its mapping version check, account validation, company lock and audit. No concurrent configuration change was observed. Cross-account protections remain those of the existing audited service; no direct MongoDB writes were used.

### Installed accounts and rules

| Purpose | Account / ID | Rules targeting account | Verified mapped lines | Source line value |
| --- | --- | --- | --- | --- |
| AR control | 1100 Accounts Receivable / `c90ee95b-fc58-4dbe-a5c8-f6aeaaf879b1` | AR control only | — | — |
| Repair / testing / bundled service | 4100 Repair / `415f9677-b9b3-4634-b5a2-61733fc90332` | 9 | 2,394 | $534,824.61 |
| Replacement components / parts | 4200 Parts / `aaef4c56-2ddf-4fa4-ab09-e495cf2324e9` | 151 | 686 | $249,902.04 |
| Complete equipment resale | 4300 Equipment / `150773a4-4af6-4e5b-ac5e-1221dd0453cb` | 1 | 58 | $28,285.00 |
| Shipping income | 4400 Shipping / `7b79f117-6dca-4722-953e-194511832836` | 2 | 221 | $35,230.35 |
| Truck-tank work | 4500 Trucks / `2b65226d-1cce-460b-a427-fdb02965787a` | 6 | 7 | $1,408.98 |
| **Total revenue rules / coverage** | | **169** | **3,366** | **$849,650.98** |

1100 meets active/company-owned Asset/control/posting safeguards with manual posting disabled. All revenue targets pass the existing active/company-owned Revenue/posting validation. Stored mapping version 1 remains intact with its historical 1010 reference; **the latest effective version 2 uses 1100**. The 1010 bank account itself was not modified.

The installed set is exactly the reviewed 162 selectors plus six truck selectors and the standalone Shipping selector, with reviewed account targets updated by the final business decisions. Predicate membership is unchanged from the hypothetical 169-rule set. There are **169 unique predicates: 166 exact-item rules and three established semantic repair/equipment/shipping rules**. No new broad fallback was added. SourceType, mappingKey, itemReference and partId retain their reviewed AND semantics; exact rules retain precedence. All previous 39-rule classifications are unchanged.

| Exact truck reference | Source type / mappingKey | Required partId | Lines | Value |
| --- | --- | --- | --- | --- |
| P711-LN2 | part-sale-invoice / part-sale-item | `6a79cf959c847523c1812e26` | 1 | $238.25 |
| P729 | part-sale-invoice / part-sale-item | `6a7f40f4c724b5ba605f8879` | 1 | $199.70 |
| P729-90 | part-sale-invoice / part-sale-item | `6a7f4152c724b5ba605f8943` | 1 | $80.91 |
| P992 | part-sale-invoice / part-sale-item | `6a79c78b9c847523c181190c` | 2 | $481.95 |
| P728 | standalone-invoice / standalone-item | `6a79e6419c847523c1816065` | 1 | $58.17 |
| T9022 | standalone-invoice / standalone-item | `6a7c9a3d4fbfa8319802b4ba` | 1 | $350.00 |

All six resolve to 4500. Exact standalone Shipping requires sourceType=standalone-invoice, mappingKey=standalone-item, itemReference=Shipping and partId=`6a6212d9ac39c3a17ee0039e`; its two lines / $1,127.91 resolve to 4400. The anonymous lines cannot match it.

Explicit business-decision checks passed: P985 five lines / $408.00 -> 4100; P111 twenty / $12,875.00 and P112 four / $2,100.00 -> 4300; P261U one / $4,500.00 -> 4200. Compared with the earlier hypothetical account targets, only the seven observed lines belonging to the six approved truck selectors changed target, from Parts to Trucks.

### Audited installation evidence

- Existing endpoint/service: authenticated `POST /api/ar`, action=mapping, `saveMapping()`, expectedVersion=1. Only this configuration mutation was submitted successfully.
- Supported `POST /dev/session` issued the normal stateless development cookie. Authentication/authorization remained in the application; no fabricated actor or authorization bypass was used. This development session creates no auth database records.
- Mapping ID: `d114afc2-1af7-4b9a-9450-5b6c16a5a094`; version **2**; created **2026-10-12T18:42:09.098Z** (2:42:09 PM EDT).
- Canonical mapping-data SHA-256: `111f725a54999c622bfa2476236c567ae9ad557e4c4449ab536e98c588b4be88`. The independently read persisted payload exactly matched the approved in-memory payload, including all selectors, targets and reasons.
- Audit ID: `efbf0585-2133-46b8-bc63-6c9eea0f3bd9`; action=ar.mapping; actor=human:dev:local-finance. Before version 1 and after version 2, account selection and all 169 rules were independently checked against the audit.
- Audit reason: “User-approved 2026-10-12 development mapping: install 169 reviewed selectors; AR 1010 to 1100; six truck-tank selectors to existing 4500 Trucks; standalone Shipping to 4400; preserve repair/equipment/parts classifications. Parallel-import preparation only; no invoices imported or journals posted.”
- Meaningful per-rule reasons identify historical/baseline reconstruction, new exact-item approval, or the specific truck/shipping business decision. No new account audit was expected because 4500 already existed.

### Fresh persisted-configuration coverage and remaining exceptions

After installation, reran the complete **2025-10-13 through 2026-10-12** period against the **persisted** mapping using unchanged scanInvoices and strict pioneer-customer-invoices-v1 validation. Run: **2026-10-12T18:42:42.402Z to 2026-10-12T18:42:43.352Z**. Thirteen complete windows / 17 authenticated GETs, page size 50, no gaps, silent truncation or duplicate cross-window identities. Every window's scanRevision matched the original completeness ledger above.

| Verification | Result |
| --- | --- |
| Invoices / lines / source total | 444 / 3,368 / $851,377.77 |
| Mapped lines / value | 3,366 / $849,650.98 |
| Unmatched lines / value | 2 / $1,726.79 |
| Equal-precedence ambiguities | 0 |
| Fully mapped invoices | 442 |
| Pass pure readiness checks, before mode/cutover gates | 440 |
| Unexpected target changes | 0 |
| Six truck selectors / standalone Shipping | All passed exact-target checks |

The two remaining unmatched lines are still F1/F2 from the exception table: F1 $0.00 placeholder and F2 $1,726.79 inbound shipping, both missing mapping identities. Their source records were not changed and no identity was fabricated. F1's separate $767.19 shipping charge remains classified exactly once.

The P201 invoices dated June 22 and July 14 retain invalid-line-quantity-or-price and missing quantity/price readiness issues because their exact stored $17.5133 unit prices are not representable in v1 integer cents. Quantities and totals were not altered. Combined invoice value $7,005.32 remains held for later authoritative review despite valid revenue classification. The four invoices with non-mode readiness issues are exactly the two freight invoices and these two price invoices. Pure readiness passes are not authorization to post: authoritative mode remains false and existing mode/cutover safeguards remain active.

### Before/after accounting invariants

The comparison starts **after** the user created account 4500, so its 53-account baseline differs from the older 52-account backup.

| Namespace / invariant | Before | After | Verified change |
| --- | --- | --- | --- |
| accounts, including bank/control accounts | 53 | 53 | Every preexisting document unchanged |
| arinvoices / imported projections | 0 | 0 | None |
| arversions / stored source revisions | 0 | 0 | None |
| journals, including drafts/posted entries | 0 | 0 | None |
| periods | 0 | 0 | None |
| armappings | 1 | 2 | One new version; prior version unchanged |
| audits | 60 | 61 | One ar.mapping audit; prior audits unchanged |
| companies | 4 | 4 | Pioneer lockVersion 5 -> 6 and updatedAt only; all other company data unchanged |
| auth_attempts / auth_sessions / auth_users | 8 / 4 / 1 | 8 / 4 / 1 | Every document unchanged |
| Namespace inventory / index definitions | 11 namespaces | Same | No additions or changes |

There are no separate bank/balance collections in this database inventory. Bank account records are unchanged, journal collections remain empty, and no posting or balance service was invoked. All document fingerprints outside the three explicitly expected configuration/audit/company changes matched. A second full fingerprint comparison confirmed the fresh live coverage verification caused **no further database change**. No account creation, balance change, import, draft, payment, ERP write, restart, migration or authoritative activation occurred.

### Recommendation for the first controlled parallel import

The installed configuration is ready for a **separately approved** first parallel import of **2026-10-01 through 2026-10-12**, page size/limit **50**, company pioneer-industries, mode **parallel**. The freshly verified window contains **36 invoices / 158 lines / $43,501.32**, all classified and without the four annual source exceptions. Recheck version 2/account safeguards, development identity, authoritative=false, current source revision and a suitable recovery point immediately before that later operation; the current backup predates this installed configuration.

Use the existing Import ERP window / audited sync service only after approval, never authoritative mode. From the still-empty AR baseline, verify 36 projections and 36 source versions, correct mapping version/classifications and expected import audits, with zero drafts/journals/postings and unchanged financial balances. Parallel projections intentionally remain review-only. Do not import the entire year as a single atomic batch; existing client bounds still apply. Historical-data recovery and prior payment/balance reconstruction are outside this import.

**Stopped after installation and verification. No import was performed.** Only this report was updated in the repository; all unrelated modified and untracked files were preserved.

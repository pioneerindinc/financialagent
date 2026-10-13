# Pioneer repair revenue allocation assessment

2026-10-12. Read-only development investigation; documentation only.

**Conclusion:** the clarified standard-repair model is supported by ERP code: a combined customer charge can be the sum of priced components and services. However, ERP does not consistently freeze that complete calculation with the issued invoice. Build an immutable internal pricing/allocation snapshot at issuance, exported through a separate versioned read-only contract. Leave customer presentation, strict invoice v1, its financial revisions, and existing parallel projections unchanged.

The approved categories are 4100 Repair Labor & Services, 4200 Parts Sales for direct sales, and 4210 Parts Revenue on Repairs. Standard repairs preserve the actual calculated parts/services split. Contract repairs preserve those standard component amounts and show a separate signed **Contract Pricing Adjustment = Actual Contract Repair Charge − Standard Calculated Repair Charge**. Do not proportionally reduce components or force any component negative to absorb a discount. Initial implementation is management-reporting evidence only, with no GL postings. These requirements supersede the earlier provisional proportional-allocation discussion; they do not authorize account, mapping or invoice changes.

For combined contract and warranty/waiver cases, the roadmap recommends distinguishing the **pre-concession contract charge** from the final billed amount: contract adjustment bridges standard to pre-concession charge, and a separate concession bridges that charge to billed net. This necessary refinement of the earlier formula is documented below for review; it prevents counting a concession twice.

## Confirmed pricing flow

| Stage | Code and behavior | Persistence / limitation |
|---|---|---|
| Technician entry | ERP `src/app/repair/page.tsx` submits part reference, description and new/used quantities to `api/repairs/draft` and `complete`. The accepted technician schema does not accept unit-price overrides. | Quantity/work evidence; no user-supplied price authority. |
| Draft save | `api/repairs/draft/route.ts` normalizes entries, calls `ensureLaborAndLiquid`, and preserves matched prior line pricing when reference, description and quantities agree. | Updates the one Repair per unit. A changed draft line need not have priced detail yet. |
| Completion | `api/repairs/complete/route.ts` normalizes services, prices lines, then restores prior nonempty pricingDetails for exactly matched lines. It sums the resulting lineTotal values. | Saves Repair.lines, pricingDetails, repairTotal, repairTotalUpdatedAt and repairTotalSource, plus completion date. It updates the existing record; this is not an append-only invoice-time pricing ledger. |
| Work after completion | `lib/revac.ts` prices additions only and preserves other line prices. Missing/discordant existing pricing blocks unsafe total maintenance. Bottle replacement has a separate controlled adjustment path. | Repair totals may legitimately change before issuance. Revision/financial locks and testing invalidation protect operational changes. |
| Draft invoice | `lib/repairShipmentInvoices.ts:buildRepairInvoiceDraft` selects billing program/workflow and constructs charge lines per unit. Ordinary non-contract Repair uses `totalRetainingRecordedPrices`. | Draft preview may use dynamic prices; it is not immutable evidence. |
| Finalization | `api/admin/shipments/[id]/finalize/route.ts` checks readiness, repair/warranty revisions and financial locks, freezes unit snapshots, invokes `createRepairInvoiceSnapshot`, writes invoice snapshots and applies inventory within repair billing transaction. | Saves billed amounts, originalAmount/warranty, unit identity, billing program, shipping and quantity-only partUsage. Does not save all component pricing inputs/adjustments alongside each billed charge. |
| Issued view | `ensureRepairInvoiceSnapshot` rejects missing finalized snapshots rather than rebuilding them. `repairInvoicePresentation.ts` projects frozen issued charges. | Customer presentation does not consult live prices. Selected Repair/Revac/semen-tank rows can consolidate while preserving source indexes and totals. Not every legacy or exceptional signature consolidates. |

Repair and invoice helpers use `repairBillingSession.ts` for scoped transactions. Some catalogue/QuickBooks price queries do not explicitly use that session. A new immutable snapshot should capture the exact values actually selected and address concurrent price changes rather than assume all price reads share one database snapshot.

## Where prices come from

### General repair component pricing

`lib/repairPricing.ts:priceRepairLines`:

1. Resolves services using known service codes and current catalogue partType.
2. Combines service new/used quantities into the service reference. A service stored in qtyUsed is **not** used physical inventory.
3. For components, resolves new and used quantities separately, including the used-reference variant.
4. Prefers finite Part.repairPrice, including explicit zero; otherwise positive Part.salesPrice; otherwise QbItemPrice.salesPrice.
5. Fails if no price is available.
6. Saves reference, quantity, unitPrice, lineTotal and priceSource in pricingDetails; sums rounded extensions.

Sources are labelled `partRepairPrice`, `partSalesPrice` or `qbCache`. No acquisition cost is implied by these selling prices. The current resolver accepts finite repair/cache values without a universal positive-price check, so future allocation validation must explicitly handle zero/negative exceptions.

**Precision detail:** persisted detail.unitPrice is rounded to cents, while detail.lineTotal is rounded after multiplying the unrounded lookup price. A fractional-cent source rate can therefore be lost in the saved rate even when the extension is correct. Future records must retain the exact decimal rate and rounding policy; do not recompute extensions from a rounded display rate.

### Standard repair invoice price

`totalRetainingRecordedPrices` uses a Repair line's recorded lineTotal when pricingDetails is nonempty and lineTotal finite. Otherwise it calls the live pricing resolver. It does not simply trust repairTotal or prove every detail sums to the line. Thus modern saved detail can preserve a price, while incomplete historical detail can trigger repricing at draft/finalization.

Patient-ready defaults add P950 Labor and P900 Liquid Test if missing. `repairDefaults.ts` skips these automatic additions for other workflows or the special semen-tank service combination; the comment “always include” is broader than the actual condition.

### Special services and contract pricing

| Case | Billing calculation |
|---|---|
| Ordinary patient-ready standard repair | Sum retained/re-resolved parts and services into a “Repair” charge per unit. |
| Revac-only / special Revac workflow | `buildRevacInvoiceLines` selects Revac or Weld Repair and Liquid Test references; uses positive **current salesPrice**, then positive QB cached price, rather than necessarily the earlier repairPrice snapshot. Missing service quantities can be synthesized as one in the Revac-only path. |
| Lincare contract | Customer-name/program and unit type select LRS190/LRP190/LRCP230; actual price comes from QB cache. The digits in the SKU are not a guaranteed price. |
| Northwest contract | NRP285 fixed $285; the cached price must equal the code constant or issuance fails. |
| Pioneer-owned resale | Equipment SKU selected by unit type and priced from QB cache; do not treat this as repair-parts revenue. |
| Standard bottle replacement | Itemizes surviving Repair lines internally; generally retains recorded component totals, with special Liquid Test priced through the sales-price lookup. Customer presentation remains a separate projection. |

Billing-program selection currently depends on recognized customer names and workflow/unit type. The saved pricingPlan/billingSku context is not a substitute for recording the **actual branch and price used**.

Contract pricing is currently a fixed-charge branch; it does not persist the proposed standard-price comparison and signed adjustment with the issued invoice. The approved enhancement must capture both computations independently. The difference is a reporting adjustment, not a change to individual part/service prices and not an approved GL account.

## Exceptions and adjustment behavior

- **Warranty:** per-unit, revision-checked selection is allowed before financial lock. Final lines retain originalAmount and set billed amount to zero. Legacy shipment-wide warranty is read-only/requires review. Warranty parts usage may still exist; zero revenue does not mean zero cost.
- **Scrap / not repaired:** can produce a zero charge. Do not fabricate a paid service allocation from work/usage quantities.
- **Bottle replacement:** `bottleReplacement.ts` verifies the approved bottle, serial/asset relationships and independent service evidence. It removes superseded Revac/Weld charges, adds the priced used replacement bottle and preserves unaffected prices. It records removed service lines in an audit. Work performed and net chargeable components are different concepts; do not allocate both removed services and their replacement charge.
- **Revac/Weld:** duplicate/changed service quantities require review. Work scans can invalidate tests without adding another charge. Bottle replacement can suppress Revac/Weld charges while preserving Liquid Test.
- **Manual overrides:** the repair-invoice PATCH schema still contains lineAmounts/shipping/warranty fields and old edit branches, but its early guard rejects those financial inputs with HTTP 409. Those branches are not evidence that current issued prices can be edited. Technician entry does not accept price overrides.
- **Discounts/waivers:** no general approved percentage-discount or component-waiver engine was found in this path. Explicit zero catalogue prices, warranty, removed replacement services, fixed contract prices and possible legacy overrides must not be collapsed into an invented “discount” field.
- **Historical maintenance:** admin backfill-labor-liquid and backfill-repair-totals code can recalculate Repair totals; these routes were inspected only, not invoked. Present Repair values do not prove original billed inputs.
- **Shipping:** separate invoice amount; exclude from repair-parts/services allocation unless a separately approved policy explicitly addresses it. Credits/returns after issuance require linked adjustments, not silent snapshot replacement.

Current code guards prevent ordinary issued-amount edits, but do not prove that every older record was created under today's guards.

## Illustrative examples — not actual customer invoices

**Standard non-contract:** retained component extensions total $120; labor $60; Revac $80; Liquid Test $20. Customer sees the existing $280 repair charge. An approved internal allocation assigns $120 to 4210 and $160 to 4100. It does not create another $120 charge or change AR. No current catalogue lookup should be required after issuance.

**Contract discount:** standard parts $120 plus services $180 = $300; actual contract charge $240. Report parts $120, services $180 and Contract Pricing Adjustment **−$60**, net $240. Components remain unchanged and nonnegative.

**Contract premium:** same standard calculation $300; actual charge $340. Adjustment is **+$40**, net $340. Never clamp a positive adjustment to zero.

**Zero standard basis:** if a complete, validated calculation genuinely totals $0 and actual contract charge is $50, the formula yields +$50 without division. Missing standard pricing is not a zero basis: mark the calculation incomplete and adjustment unknown. Warranty and other exceptional zero charges require the explicit treatment described below.

Proportional allocation is not part of this approved model. Do not distribute contract adjustments into parts/services, even for a more convenient chart or report total.

## Historical evidence and approved prospective boundary

The preceding [parts design census](PIONEER_PARTS_REVENUE_DESIGN_ASSESSMENT.md), verified 2026-10-12 at 19:11:53 UTC, established 444 parallel projections, 3,368 lines and $851,377.77. Its 144 repair invoices contain 2,414 item lines linked to 2,387 current repair units. Only one invoice has quantity-only partUsage (three units/eight lines). Of 447 generic Repair charges, 173 match current repair-line totals and 274 differ; 167 billed lines link to a current completion later than issuance. Current linked repairs have 21,963 positive-quantity usage lines, only 11,201 with pricingDetails. These are prior verified development findings, not a fresh database census in this documentation update.

The projections lack invoice-time component pricing and cannot establish reliable bundled historical allocations. Matching current totals is not sufficient evidence. Existing explicit service/equipment/direct-sale classifications remain valid under their prior review, but are not reconstructed allocations.

**Approved scope: prospective only, from January 1, 2027, determined by repair invoice finalization date.** Preserve every existing 2026-and-earlier invoice, classification, mapping and parallel projection. Do not reconstruct, reprice, backfill or reclassify historical repair allocations, including the 173 matching-total cases. Report pre-effective invoices as “outside allocation policy period,” not incomplete zero-valued allocations. The earlier exploratory backfill/proportional proposals are superseded.

### Controlled company configuration

Propose an audited, versioned company configuration with companyId, allocationEnabled, effectiveDate=2027-01-01, businessTimeZone, allocationPolicyVersion, approvedBy/approvedAt and revision. No configuration was changed here. Activation is a reporting feature flag, independent of authoritative AR. Require authorized company-scoped changes and optimistic concurrency; record the exact configuration revision on every evidence record. Do not allow a later configuration edit to trigger retrospective capture or silently change issued records.

Eligibility is evaluated only during the first successful transition to finalized, using a server-assigned immutable finalizedAt converted to the approved company timezone. It is not based on repair completion, editable invoice date, import time or report execution. A repair completed in December but first finalized in January is eligible; a December-finalized invoice received by Financial Agent in January is not. An ordinary retry or reopening/viewing an old invoice must not recapture it. Genuine cancellation/reissue needs an explicit linked policy, not a way to evade the boundary.

Use the decided America/Indiana/Indianapolis company timezone; at that boundary January 1, 2027 00:00 local is 05:00 UTC. Do not rely on server timezone. If rollout occurs late, no automatic January catch-up from mutable records: report the gap and seek a separate decision. The date is eligibility, not permission to activate production or accounting.

## Exact immutable capture point

ERP api/admin/shipments/[id]/finalize/route.ts obtains issuedAt and calls createRepairInvoiceSnapshot after unit/readiness/warranty checks. It then assigns repairInvoice and invoiceSnapshot, marks finalizedAt/status, and saves inside the repair billing transaction.

Capture the pricing calculation **inside the same calculation that creates repairInvoice**, then validate and persist either complete allocation evidence or a durable allocation-exception record within that transaction before commit. Do not run a second pricing lookup after invoice construction. Bind it to the resulting unchanged v1 sourceId/sourceRevision and source-line positions. Preserve invoiceSnapshot/customer presentation untouched. Include configuration revision and immutable original finalization timestamp. If a transaction retries, use the same operation identity and never create duplicate evidence; rolled-back attempts must leave neither invoice nor evidence committed.

Allocation-only missing-price, classification or reconciliation failures must not invalidate a valid operational invoice: capture a structured exception instead. Existing operational pricing/readiness failures still behave as before; the enhancement must not bypass them.

For contract invoices the existing fixed-charge branch does not necessarily compute standard component prices. Add a separately recorded standard calculation at issuance using the approved repair pricing basis, alongside the actual contract charge. Label retained earlier prices versus live prices selected at issuance. Neither may be described as historical invoice-time evidence when computed later. Freeze the exact evidence selected at finalization, including retained earlier line prices when that is the existing calculation. This decision does not authorize repricing all repairs to then-current catalogue rates. No later catalogue lookup may reconstruct the snapshot. The precise counterfactual standard branch for contract-only cases must be specified and tested.

## Separately versioned evidence model

Proposed contract: pioneer-repair-revenue-allocation-v1, independent of pioneer-customer-invoices-v1. A separate collection/export avoids adding properties or changing the hash inputs of strict invoice v1.

| Section | Required fields/meaning |
|---|---|
| Identity | allocationId, schemaVersion, company, USD currency, v1 sourceId/sourceRevision, canonical invoice ID, unit/visit ID, sourceLineId or exact source-line group; each source line belongs to one group only. |
| Eligibility | originalFinalizedAt, effectiveDate, businessTimeZone, companyConfigRevision, policyVersion, environment/test marker. |
| Provenance | capturedAt, actor, repair revision, actual billing branch, calculation version, immutable input hash. Per-component basis: retained-repair-price or selected-at-finalization, original capture time if known, catalogue/QB identity/version, precision limitations. |
| Components | Stable component ID, part/reference identity, captured physical-part/service classification, new/used/service condition, exact decimal quantity/rate when available, authoritative rounded extensionCents, priceSource. Service qtyUsed never means used inventory. |
| Standard totals | partsCents, servicesCents, standardCalculatedRepairCents. Preserve standard component values, including explicit legitimate zeros; missing prices remain unknown. |
| Actual/adjustment | actualBilledRepairCents, preConcessionChargeCents, signed contractPricingAdjustmentCents for contract groups, separately typed concession adjustments, reason and authority. Preserve positive/negative values. |
| Lifecycle | completeness/status, unresolved reasons, content hash and independent evidence revision, approved correction/supersedes linkage. No silent overwrite. |

Keep work performed/suppressed charges distinct from billable calculation components. Superseded Revac/Weld work must not be counted again when a replacement bottle substitutes for its charge. The approved model does not authorize inventing missing prices or making a physical component negative. Any anomalous negative source component is a review exception, not normalized away.

### Reconciliation and rounding invariants

For each complete repair allocation group, using signed safe-integer cents:

- P = sum of standard physical-parts extensions; S = sum of standard labor/service extensions; T = P + S.
- Define B as the selected repair charge before an explicit waiver/warranty; C as the sum of separately evidenced signed concessions; A as the actual billed charge.
- Standard non-contract: B = T; P + S + C = A. Without concessions, A = T. An unexplained difference is an exception, never a fabricated adjustment.
- Contract: J = B − T; P + S + J + C = A. Without concessions, B = A and the original formula J = A − T applies. J may be negative, zero or positive; never clamp or distribute it into components. A−T is the total pricing difference, equal to J+C, not solely contract pricing when concessions exist.
- The sum of group actual charges plus unchanged shipping/equipment/other source charges equals the invoice total exactly. Freight and equipment are not repair components.
- Zero and missing are distinct. If T is unknown, J is unknown and the record is incomplete. No division is required when T is a verified zero.
- Preserve exact selected decimal rates and explicit rounding algorithm; round extensions once according to billing behavior. Sum saved extensions in cents. Never infer the actual rate from a rounded displayed rate. Existing rounded-only prices require an explicit precision flag.
- A rounding difference is not a discount. Capture its real computational provenance, or reject completeness; do not manufacture a balancing component.

**Recommended clarification to the earlier formula:** separate contract pricing from concessions using the bridge above. Example: standard parts $120 + services $180 = $300; contract-before-warranty $240; warranty concession −$240; actual billed $0. Report contract adjustment −$60 and warranty −$240, net $0. Reporting −$300 as contract adjustment and then subtracting warranty again would be wrong. Preserve calculated components as gross management evidence, never describe the $300 as earned/billed revenue. A non-contract $300 full waiver similarly shows $300 components and −$300 concession, net $0.

ERP already saves originalAmount before its per-unit warranty transformation, providing B for that branch; amount provides A. It does not supply a generic waiver/override reason ledger. Unknown reasons or missing pre-concession evidence produce exceptions, not inferred concessions. For scrap and superseded bottle services, retain work evidence but do not fabricate a pre-concession charge that the calculation never produced.

Evidence facts are immutable. An approved correction appends a linked version and reports its relationship to the original; it cannot change invoice v1 financial revision merely because reporting classification changes. Historical pre-effective records remain outside this feature. GET endpoints must only read already-captured evidence and must never initialize or backfill it.

## Financial Agent reporting without double counting

1. Receive a separately authenticated, company-bound, strictly validated evidence feed with complete pagination, consistency tokens and explicit unknowns. Bind exact source revisions/line groups; reject duplicates, foreign tenants and stale bindings.
2. Start with read-only/in-memory simulation; any future supplementary persistence requires separate authorization. Do not import a second invoice, modify source payloads or change existing mappings.
3. Keep invoice value and allocation breakdown as two views of the same revenue. For a contract example, report parts $120 + services $180 − contract adjustment $60 = net $240, **not** invoice $240 plus those components.
4. Display standard/calculated category amounts, signed contract adjustments, separately classified concessions and reconciled billed net separately. Label the results management reporting, not posted GL revenue. Missing evidence remains an exception with actual invoice value visible, rather than disappearing from totals.
5. Direct parts sales continue under 4200. Preserve equipment/shipping/truck policy and all 169 installed mapping rules. The 444 historical parallel projections remain unchanged; pre-effective history receives no new allocation classification.
6. No account creation, GL mapping for the adjustment, AR activation, journals or balances are required for this reporting design. A future authoritative accounting design would require separate approval, including treatment of the adjustment; it is outside rollout scope.

Keep customer-facing single repair charge presentation unchanged. Existing frozen internal lines may be consolidated by repairInvoicePresentation; test the actual PDF/UI output as well as source totals. Do not introduce internal parts/adjustment rows into customer documents.

## Development testing before January 1, 2027

Use pure calculation fixtures and an injected test clock/configuration in isolated disposable development tests, with simulated finalization dates on either side of the boundary. Never change the machine clock, live effective date or existing invoices to make them eligible. Integration tests, when separately authorized, must use disposable fixture companies/databases and distinct test identifiers, with production guards and no accounting posting capability. Current shared historical data is read-only comparison evidence, not a mutation fixture.

Test records must be clearly marked and excluded from normal reporting. A development-only preview can calculate proposed evidence in memory without saving invoices/evidence or invoking finalization. Do not create missing allocations during report reads. This assessment authorizes no test writes or implementation.

## Workflow conflicts and recommended corrections

| Finding in current code | Plan correction / limit |
|---|---|
| Contract branches select a fixed price without necessarily computing standard components. | Compute and freeze the supplementary standard basis at issuance. If unavailable, finalize the otherwise valid invoice with an allocation exception; do not guess prices. |
| Standard prices may be retained from repair completion; special services may use a live sales-price lookup during finalization. | “Captured at finalization” means freeze the actual selected evidence, not universally reprice to current catalogue. Preserve branch/source/timestamp and exact known precision. |
| Per-unit warranty transforms originalAmount into zero amount after charge calculation. | Preserve both and use separate concession C; use pre-concession B for contract adjustment. This refines the earlier J=A−T definition only when concessions exist. |
| Current finalization is one MongoDB transaction and rejects non-draft shipments. | Commit invoice plus complete evidence OR exception atomically. An allocation calculation failure is a recordable outcome, not an invoice failure. A retry must inspect committed outcome and never finalize an already-finalized shipment again. |
| Failed database writes can abort the MongoDB transaction; catching the error cannot make that transaction valid. | Use a validated minimal exception outcome before persistence, not a failed insert followed by another insert in an aborted transaction. If neither evidence nor durable exception can be stored, no design can guarantee both continuation and durable visibility. Recommend rollback under existing infrastructure-failure behavior and operational alert; do not silently commit an untracked invoice. This limitation needs explicit rollout acceptance. |
| Issued invoices do not contain all component rates; current Repair records can change. | No historical backfill. Recovery of a post-effective exception may use only original captured evidence, append a reviewed resolution, and never consult later catalogue values as substitutes. |
| Legacy fractional-rate extensions may not reproduce from saved rounded rates. | Preserve saved extension and precision flags; no retrospective rounding correction or invented balancing component. |

### Durable allocation exceptions

Every eligible finalized invoice must have a unique complete-or-exception outcome. An exception contains company, invoice identity and revision when derivable, original finalization timestamp, policy/configuration revision, stage, stable reason codes, missing fields, actual billed amount, available immutable calculation facts, capture time and operation ID. If revision generation itself fails, preserve canonical invoice identity and explicit missing-revision status; ingestion must not reconcile it until correctly bound. Never store credentials or unnecessary customer narratives.

Expose exceptions in an ERP operator queue and integration feed, with visible counts and a link to the invoice. Financial Agent reports the actual billed total in its reconciliation denominator while showing the allocation as incomplete; it must not use zero or a current-price estimate for missing categories. Acknowledgment is separate from resolution. Preserve the original exception and append audited status/resolution history. Define an owner and escalation target before rollout. GET/report reads do not repair records or initialize data.

## Staged implementation roadmap and acceptance gates

Each phase requires separate implementation authorization. This document makes no code, configuration or deployment change.

| Phase | Scope / owner | Acceptance gate |
|---|---|---|
| 1 — ERP model and configuration | ERP: versioned company configuration, immutable calculation/evidence and exception schemas, stable operation/component IDs, first-finalization eligibility. | January 1, 2027 in America/Indiana/Indianapolis (05:00 UTC) is inclusive; December 31 excluded. December-completed/January-finalized included. Late import/view/retry cannot make history eligible. Configuration revisions audited and immutable on evidence. No pre-effective mutations. |
| 2 — Pricing and adjustments | ERP: collect actual selected standard pricing, fixed contract charge, originalAmount/warranty and explicit concession reasons; validate signed bridges. | Golden fixtures preserve existing billed values, source lines, customer single-line presentation, shipping, bottle/service suppression and operational safeguards. Test J negative/zero/positive, concessions, zero basis, unknown basis, precision and no negative component used as a plug. Gross + adjustments = billed net exactly. |
| 3 — Immutable capture and exception continuity | ERP: instrument the existing calculation and persist complete/exception outcome alongside finalization; no second price lookup. | Missing supplementary price/classification produces a visible durable exception with invoice success. Existing operational invalid invoices still fail. No partial outcome, duplicate retry or lost exception. Database/transaction failure behavior is explicitly tested and approved; do not claim unconditional continuity. |
| 4 — Versioned integration | ERP: separate pioneer-repair-revenue-allocation-v1 endpoint, including complete evidence, exceptions and append-only corrections. | Strict invoice v1 golden/consumer tests unchanged; same identities, financial revisions and pagination under evidence-only updates. Auth/company scoping, bounded complete scans, stable snapshot/cursor, independent evidence revisions and no GET writes. |
| 5 — Financial Agent ingestion/reconciliation | Financial Agent: separate supplementary ingestion, source-revision/line binding, idempotency and completeness checks. Start with in-memory simulation; later persistence uses authorized audited services. | No invoice imports or source-version changes; unchanged existing mappings/parallel projections. Duplicate feed replay adds no duplicate evidence. Stale/foreign/malformed records rejected; failed scans yield no partial reconciled result. Every eligible billed amount is represented as reconciled or exception, never dropped. No journals/drafts/payments/balance effects. |
| 6 — Management reporting | Financial Agent: parts 4210, services 4100, direct sales 4200 reporting categories, separate contract and concession columns, billed net and exception coverage. | One invoice contributes its value once. Gross component amounts clearly labelled calculated, not earned revenue; warranty net zero. Aggregate bridge equals actual billed invoice totals including unchanged non-repair categories. Exceptions remain visible. No GL accounts/mappings/authoritative AR required. |
| 7 — Development verification | Both: pure fixtures, injected time/config, isolated disposable integration resources, failure injection and read-only baseline comparison. | No modification of live clock/effective date or accepted history. Test boundaries, concurrent configuration/prices, transaction retry/outage, durable exceptions, corrected evidence, reissue linkage, permissions and customer PDF/UI regression. Test data excluded from normal reports. Existing 169 mappings and 444 historical projections remain unchanged. |
| 8 — Production reporting rollout, separately approved | Release owners: reviewed deployment/configuration runbook, backup/recovery, monitoring, ownership and staged reporting enablement; no production activity in this task. | All prior gates pass, infrastructure-failure limit accepted, exception queue staffed, production guard/config checked under separate approval. Enable prospective capture before first eligible finalization; consumer delivery/reporting can stage independently. No authoritative AR or GL activation. Late deployment reports a gap without reconstructing history. |

Rollback must not erase captured evidence or exceptions or rewrite invoices. If consumer/reporting is disabled, keep the producer's durable capture/exception path functioning. Disabling producer capture for eligible invoices creates a coverage gap; document it explicitly and require approval rather than implying later reconstruction is possible. Delivery recovery replays immutable stored outcomes only.

## Remaining rollout decisions

- Confirm the exact standard-comparison branch for each contract/workflow and classify truck/equipment/bottle exceptions; preserve the approved parts/services intent.
- Accept the proposed B/T/J/C/A terminology for combined contract concessions; approve exceptional override/scrap reason taxonomy without inventing existing data.
- Accept the infrastructure-failure limitation and choose exception ownership, escalation, recovery and retention procedures. Calculation failures must preserve valid operational finalization.
- Define genuine cancellation/reissue and post-effective evidence-correction authority; no pre-effective reconstruction or reclassification.
- Approve management report labels/filters and operational rollout/rollback owners. Date, timezone, prospective scope, separate concessions and management-only accounting scope are no longer open policy questions.

Existing ERP suites include repair-entry-workflows, revac, revac-pass2, shipment-warranty and repair-invoice-presentation, plus producer/consumer strict-v1 compatibility tests. Their existence does not validate this proposed feature. No mutation-capable tests or production checks were run in this assessment update.

Only this assessment document was updated. No code, databases, accounts, mappings, invoices, projections, journals, configurations, deployments or production systems were changed.

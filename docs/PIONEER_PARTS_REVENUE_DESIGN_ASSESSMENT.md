# Pioneer parts revenue and gross-profit design assessment

2026-10-12 — read-only development investigation.

**Recommendation:** retain strict invoice v1 and the installed mappings unchanged. Use existing invoice-family fields for a clearly labelled origin report now; implement a separately versioned, invoice-revision-bound parts allocation/cost evidence contract before attempting a reliable 4200/4210 split of bundled repair revenue. Account 4210 is available, but creating it alone cannot supply missing historical revenue or cost evidence.

## Verified scope

Financial Agent: `financialagent_dev` at `127.0.0.1:27291`, replica `financialagent-dev`. ERP: approved `equipment_tracker_dev` at `127.0.0.1:27119`, replica `cfoFixture`. Existing workspace/controller, environment and ERP URI fingerprint guards were used unchanged.

Fresh complete strict v1 scans, in 13 monthly/partial-month windows, covered 2025-10-13 through 2026-10-12. All 444 source identities/revisions/fingerprints matched the retained parallel versions. No accounts, mappings or journals were written. Authoritative AR remains disabled.

| Invoice family | Invoices | Exported lines, including shipping | Source value |
|---|---:|---:|---:|
| Repair shipment | 144 | 2,452 | $505,324.66 |
| Parts sales order | 261 | 868 | $263,790.47 |
| Standalone | 39 | 48 | $82,262.64 |
| Total | 444 | 3,368 | $851,377.77 |

Read-only checks completed 2026-10-12T19:11:53.655Z. Complete Financial Agent collection/document/index snapshot remained unchanged during this investigation: `d970140d4d274c84e75057cf017d6836bd3c7a36e3a3e171e3715b76687bea8b`. Bounded ERP metadata snapshot remained unchanged: `5bbbf589b02767c84ca48cf99ddaab732d0f518207f19a4f77b63927b365291b`. Native metadata reads avoided model initialization, index creation and authenticated session writes. No report/API path with possible initialization side effects was invoked.

## Confirmed ERP relationships

### What /admin/reports/parts actually measures

`src/app/admin/reports/parts/page.tsx` renders `PartsReportClient.tsx`, which calls `src/app/api/admin/reports/parts/route.ts`.

The report separates **quantities by source workflow**, not revenue accounts:

- Sold: nested `PartSale.invoices[].lines[]`, dated by invoice creation; also standalone invoice lines with a part ID, dated by invoice creation. Voided parent sales/standalone invoices are excluded.
- Used on repair: `Repair.lines[]` with `qtyNew` and `qtyUsed`, dated by repair completion. This is not a join to billed repair invoice lines.
- New/used quantities are split using flags and used-number conventions. Active sales kits are expanded to components; report normalization combines reference variants. Known services/current service catalogue items are excluded.
- Only positive quantities are counted. The report does not establish complete returns/credits treatment.
- Current kit definitions and catalogue descriptions/classifications are consulted. Repair-completion dates and local date boundaries differ from the financial invoice export's UTC invoice dates.

Consequently, identical part numbers can correctly appear in both sold and repair columns. These columns do not prove separately invoiced parts revenue, historically recognized COGS, or reconciliation to the GL. Standalone “sold” is a report convention, not proof that every standalone transaction is a direct retail sale.

### Invoice and operational lineage

| Workflow | Relationships and limits |
|---|---|
| Direct parts order | `PartSale` holds order lines, invoiced/shipped quantities and nested invoice snapshots. Invoice lines retain part ID, reference, quantity, selling rate and extension. This schema does not provide a repair-job link establishing that a separately sold replacement component was installed on a repair. |
| Repair sales order / shipment | `Shipment.repairSalesOrderId` optionally links the order; `Shipment.unitIds` links serviced units. `Shipment.repairInvoice` is the billed snapshot. Invoice lines carry unit ID, item/service code and amount. |
| Repair consumption | `Repair.unitId` links one mutable repair record per unit. Its lines hold new/used quantities and selling-price details. `Unit.partsUsed` also supports inventory consumption. These are not additional customer invoices. |
| Issued repair snapshot | Current issuance stores `repairInvoice.partUsage[]`, grouped by unit, with part reference and quantities. The snapshot does **not** preserve a per-part revenue allocation or acquisition cost. Issued invoices are not automatically rebuilt from live repair records. |
| Standalone invoice | Supports catalogue and free-text lines. No reliable repair-job origin discriminator was found in the inspected invoice schema/export. Business evidence is necessary for exceptional repair-related standalone charges. |

Relevant ERP sources: `src/models/{PartSale,Repair,RepairSalesOrder,Shipment,StandaloneInvoice}.ts`, `src/lib/repairShipmentInvoices.ts`, `src/lib/repairInvoiceInventory.ts`, `src/lib/repairSalesOrders.ts`, and invoice creation/finalization routes.

### Repair billing does not equal a list of separately sold parts

`repairShipmentInvoices.ts` can generate:

- One “Repair” amount per unit, computed from repair pricing.
- Fixed contract service charges.
- Revac/Weld Repair and Liquid Test service lines.
- Equipment resale lines under `pioneer_resale`.
- Itemized bottle-replacement workflow lines.
- Zero-value warranty/scrap lines.

For generic repairs, selling-price totals may include components and services inside one billed line. Contract charges need not equal the sum of component selling prices. Current price reconstruction may consult catalogue or QuickBooks price caches when retained pricing detail is absent. Quantity consumed does not establish the amount earned for that component.

**Do not debit additional AR or add parts revenue on top of the full repair invoice.** Any approved split must allocate the existing billed amount, with the repair/service remainder reduced by the same amount.

## Existing v1 classification capability

Both producer `src/lib/financialAgentInvoices.ts` and consumer [contract](../src/domains/ar/contract.ts) are strict.

Already exported and retained:

- Invoice `sourceType`: part-sale-invoice, repair-invoice or standalone-invoice.
- Line `mappingKey`, sourceLineId, partId, itemReference, unitId and amount.
- Repair-family equipment versus repair-service mapping keys.

Exported operational `context` also contains canonical parent, shipment/order and billing program, but Financial Agent intentionally omits context from retained payloads. No costs, repair parts usage or parts/service revenue allocations are exported. Positional sourceLineId is valid only with its invoice revision.

The producer's repair mapping chooses equipment-sales for pioneer_resale and repair-revenue for standard/contract programs; it does not distinguish a component from labor within those programs. The consumer [mapping resolver](../src/domains/ar/mapping.ts) can match sourceType + mappingKey + exact reference/part ID, with exact selectors preceding defaults. It cannot split one source line across accounts.

**Existing fields suffice** to distinguish explicit, correctly identified repair-family component lines from identical references on parts-sale invoices, using separately reviewed sourceType-scoped rules. No v1 change is needed for that limited case. They do **not** suffice to extract components hidden in combined repair charges or establish repair origin for a parts-sale/standalone exceptional transaction.

Do not change mappingKey semantics, add v1 fields, include usage/cost in v1 hashing, or weaken strict validation. The prior billingSnapshot compatibility defect demonstrates why an unversioned addition is unsafe.

## Historical coverage and exceptions

| Finding | Verified result | Interpretation |
|---|---|---|
| Current 4200 mappings | 151 of 169 rules | No installed repair-parts split exists. |
| Parts-sale lines mapped to 4200 | 685 lines / $248,109.04; 150 distinct references | Parts-sale workflow is known; physical use by the buyer is not. |
| Standalone lines mapped to 4200 | 1 line / $1,793.00 | Retain current mapping; direct-versus-repair origin needs independent evidence if material. |
| Total 4200 | 686 lines / $249,902.04 | Do not simply transfer this whole amount to 4210. |
| Repair invoice item lines | 2,414; all have unit IDs; none has partId | Service/equipment billing lines, not a complete component sales ledger. |
| Saved repair partUsage | 1 of 144 invoices; 3 units, 8 usage lines, 7 part references | Usage evidence only; no supported full revenue split even for this invoice. |
| Repair order link | 38 of 144 invoices | Absence of order link does not erase known repair invoice family, but limits detailed lineage. |
| Current repair lookup | All 2,414 billed item lines find a current Repair; 2,387 distinct units | A present-day join is possible, but is not an immutable invoice-time snapshot. |
| Current generic Repair total comparison | 173 of 447 charges equal current summed repair-line totals; 274 differ | Equality alone is not proof; differences do not establish a source invoice defect. |
| Current completion timing | 167 invoice lines link to a Repair completed after invoice issuance | Reinforces that present operational records cannot silently reconstruct invoice-time composition. |

Current repairs for those 2,387 units contain 21,963 positive-quantity usage lines: 16,945 resolve to non-service catalogue records, 5,014 to services, four have no catalogue match under the inspected normalized lookup. Only 11,201 have nonempty pricingDetails. There are 189 normalized references; 107 references overlap the current 4200 references. These counts describe **current operational evidence**, not accepted historical revenue allocations; current kit expansion was not applied to this diagnostic comparison.

Observed repair billing references comprise generic Repair and contract service codes, Revac/Weld/Liquid Test codes, and P110/P111/P112 equipment. No observed itemized replacement-component repair invoice line was established as a safe 4210 candidate from v1 alone. Equipment, services and freight retain their existing classifications.

The earlier approved P261U replacement-bottle line is in the **parts-sale family**, despite business context describing installation during repair. Its part number and prior narrative do not provide an exported repair-job identity. Obtain explicit transaction evidence/linked origin before moving it to 4210. Likewise, preserve the separately approved truck-income rules rather than reclassifying truck work automatically.

The two unidentified freight lines stay exceptions; neither is parts revenue. The two fractional-cent P201 invoices remain valuation-readiness flags, not evidence of repair origin. No catch-all provenance rule is appropriate.

**Historical answer:** all invoice families are known, but a correct full historical 4210 amount and per-part repair gross profit cannot presently be certified. Preserve unresolved/bundled amounts as existing repair revenue in the baseline, and label any proposed analytic allocation separately. Do not promise 100% classification.

## Revenue and COGS account structure

| Account | Current / proposed use |
|---|---|
| 4200 — currently “Parts” | Active Revenue, non-control. Proposed display name “Parts Sales” requires separate authorization; direct customer component sales under approved origin policy. |
| 4210 — proposed “Parts Revenue on Repairs” | **Available:** no Pioneer account with code 4210 was found. Later create as active posting Revenue, non-control, through audited account governance. Recheck availability/version at installation. |
| 4100 — Repair | Keep service/labor/Revac/Liquid Test and the residual of approved bundled allocations. No automatic removal of all parts-related service revenue. |
| 4300 Equipment / 4400 Shipping / 4500 Trucks | Preserve current approved semantics. Define precedence if truck repair parts should later be segmented inside truck revenue. |
| 5000 COGS / 5100 Parts / 5200 Equipment | Existing active Expense accounts. 5100 could remain aggregate parts COGS with an origin dimension; a separate repair-parts COGS account is an optional later business decision, not created or number-reserved here. |

The same catalogue part must be allowed in both 4200 and 4210. A global part.salesAccountKey or partId-only rule cannot satisfy that requirement. Separate **product category**, **transaction origin**, **new/used condition**, and **cost basis** dimensions; an origin of repair must not turn labor, equipment or shipping into parts.

## Costing availability and limitations

ERP direct/standalone invoice lines can capture `unitCostSnapshot`, `costCapturedAt` and `costSource=part-purchase-cost-at-invoice`. Capture reads current Part.purchaseCost; it is not proof of FIFO, weighted-average, landed or specific acquisition cost. Missing purchaseCost can become zero. Existing capture may reuse a snapshot by part ID; used items are skipped. Do not treat all zero/missing cost as free inventory.

| Source invoice item lines | Lines | Cost snapshots | Positive / zero snapshots | Missing |
|---|---:|---:|---:|---:|
| Parts sale | 690 | 260, all dated | 250 / 10 | 430 |
| Standalone | 45 | 1, dated | 1 / 0 | 44 |

These denominators include service/other item lines, not only eligible physical inventory; they measure available evidence, not 474 missing inventory costs. Thirteen parts-sale lines are flagged used. No reliable historical repair acquisition-cost snapshot is present in the inspected repair line/snapshot model.

`src/lib/inventoryManagerReporting.ts` already calculates a management margin view:
- Direct sales use saved unit-cost snapshots, flagging missing costs.
- Repair costs use **current** catalogue purchaseCost × current repair quantity, including new/used quantities.
- Repair “revenue” uses current Repair.lineTotal, on completion dates, not necessarily the customer invoice charge.
- Kit amounts are allocated by expanded component quantity, conserving cents. This is an explicit reporting allocation convention, not evidence of historical acquisition cost or an approved bundled-repair allocation.

Thus its “recognized”/“complete” labels must not be interpreted as authoritative financial recognition or historically reliable gross profit. Current kit structures, service classifications, prices and repair records can change historical views. Warranty, used parts, recoveries/cores, returns, contract bundles, freight and labor/overhead require policy.

`partInventory.ts` keeps quantity adjustments and invoice references; the inspected issue records do not establish cost layers. `financeInventoryEstimate.ts` explicitly exports a current-purchase-cost estimate. `financeInventoryOutbox.ts` defines future receipt/sale/job-issue/job-complete events, but explicitly is not enabled on existing operational routes. This primitive is not evidence of a populated historical cost ledger. Financial Agent's current AR invoice posting debits AR/credits revenue; it does not post inventory/COGS.

**Conclusion:** separate operational usage and estimated margins are possible. Authoritative direct-versus-repair COGS requires approved valuation, captured issue cost and reversal timing, reconciled inventory/GL controls, and a complete event history. Do not backfill missing historical costs from today's catalogue and present them as actual.

## Smallest safe implementation

1. **Read-only origin analysis first in Financial Agent.** Report existing invoice families and approved categories using v1 retained evidence. Show bundled repair, standalone-unknown and separately sold repair-related exceptions explicitly. Preserve all 169 rules and all 444 source versions.
2. **Producer-owned, separately versioned supplementary evidence contract.** Prefer a dedicated read-only invoice-classification/allocation contract over modifying v1. Bind every result to tenant, v1 sourceId, sourceRevision and sourceLineId; include immutable origin/job/usage identities, evidence basis, part identity, condition, allocation method/version, amounts, unknown reason, and optional cost amount/basis/date/quality. Use complete pagination and snapshot/revision validation. Never attach evidence to a changed positional invoice line.
3. **Prospective source capture.** Snapshot component selling-price evidence, quantities, cost provenance and kit composition at issuance/issue time. Decide whether invoice lines become explicitly itemized or a documented allocation of a bundled line is retained. Preserve invoice totals and include services/discounts/zero allocations. A quantity-only partUsage snapshot is insufficient.
4. **Consumer-owned analytic allocation layer.** Validate supplementary evidence separately; retain invoice evidence unchanged. For multiple components in one invoice line, allocation amounts plus residual must equal that line exactly. Resolve explicit origin/category selectors deterministically. An exact part rule must not defeat origin-specific rules; test ambiguity rejection.
5. **Account/mapping installation only after approval.** Recheck 4210; create/rename accounts through audited services. Version mappings/allocation policy independently. Existing 151 parts selectors can remain 4200 for confirmed direct origin; new 4210 selectors need reviewed provenance. Do not change the repair-revenue default wholesale. A future one-to-many allocation engine is an application change, not merely a 170th mapping rule.
6. **Historical backfill as evidence, not reimport.** If approved original invoice/QuickBooks detail or immutable issuance snapshots establish composition, add separately versioned analytic classifications with evidence references and confidence. Current Repair data alone is insufficient. Do not rewrite v1 hashes, manufacture new source revisions, supersede projections or create invoices to change reports.
7. **Financial activation remains separate.** This dataset is parallel/nonposting. Keep revenue analysis labelled source/management reporting, not posted revenue. Future posted reclassification requires its own approved accounting treatment; no new AR or duplicated revenue. Follow the separate [AR readiness assessment](PIONEER_AR_AUTHORITATIVE_READINESS.md).

If the business needs origin/cost embedded in the invoice itself rather than supplementary evidence, negotiate a new invoice contract version with dual-contract compatibility and migration design. Neither approach permits adding fields to strict v1 or altering its revision hash.

## Migration and tests

- Baseline 444 identities/revisions, 3,368 lines and $851,377.77; all remain unchanged after analytic classification.
- Producer strict-v1 golden/consumer-compatibility tests: exact established keys, byte-stable financial revision under origin/cost-only updates, unchanged pagination.
- Same part and same part ID on direct/repair/standalone origins; parts/services/equipment/shipping/truck precedence; no reference-prefix inference.
- Bundled, fixed contract, itemized replacement bottle, warranty, Revac/Liquid Test, used parts and kit cases. Allocations conserve source cents; quantities do not create revenue.
- Missing/mutated repair evidence, duplicate unit/parent links, positional-line changes and revision mismatch reject enrichment; no silent current-record reconstruction.
- Mapping regression across 169 rules, including all 151 parts rules. No change to the 444 stored versions, mapping version 2 or source fingerprints during a simulation.
- Costs: null versus zero, unknown historical cost, used/core recovery, kit changes, rounding, receipt/issue reversal, future cost revisions. Show cost completeness alongside margin; suppress unsupported actual gross profit.
- Reconcile billed revenue by invoice and account to source totals; reconcile any future COGS by origin to a single inventory issue, never both usage and sale for the same event.
- Audited later installation with concurrency checks; no import required for report-only reclassification. Test no journals, drafts, balances, payments or lock/audit writes from read-only reporting.

No new executable code was written and no mutation tests were run in this investigation.

## Business decisions still required

| Question | Why it matters |
|---|---|
| Does 4210 mean separately charged repair parts only, or an allocation within fixed/bundled repair prices? | Determines whether existing exact line mapping suffices or a revenue-allocation engine is necessary. |
| How should fixed-price repair revenue be allocated? | Standalone selling prices, contractual detail or another approved method may differ; usage cost/quantity alone is not an answer. |
| Are repair-related separate parts-sale/standalone charges eligible for 4210? | Need explicit linked origin, including the prior P261U case; invoice family alone may not reflect intended business meaning. |
| How do truck parts interact with 4500? | Preserve the prior approved truck classification until a hierarchy/precedence is approved. |
| What constitutes historical evidence sufficient for backfill? | Most repair invoices lack issuance usage snapshots; report unknowns rather than invent allocations. |
| Is gross profit actual inventory cost or an explicitly labelled estimate? | Current purchase cost and sparse invoice snapshots cannot establish complete historical COGS. |
| Separate COGS accounts or origin dimensions? | Revenue accounts alone cannot deliver per-part margin. Decide used/core/kit/freight/labor policies and timing. |
| Prospective-only start and 4200 rename? | Choose effective date and authorized account changes without rewriting history. |

**Next recommended action:** approve the origin taxonomy and bundled-revenue allocation policy, then authorize a read-only supplementary evidence prototype and reconciliation report. Do not install 4210 mappings or promise historical part-level gross profit yet.


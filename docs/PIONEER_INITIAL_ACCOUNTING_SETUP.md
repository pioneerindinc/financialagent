# Pioneer Industries initial accounting setup — audit and proposal

> Current decision: the user has configured/reviewed the COA. QuickBooks remains official through **12-31-2026**, with FinancialAgent planned to begin **01-01-2027** after reconciliation/sign-off. The October 2026 proposal and earlier next-step/period recommendations below are historical and superseded by [Pioneer 2027 accounting setup](PIONEER_2027_ACCOUNTING_SETUP.md), including explicit OPEN monthly setup and posting/header governance. This document is not an instruction to re-create the proposed COA.

Audit date: September 14, 2026. Local source baseline: `12e9fb9`, branch `main`. This is a design document, not an executable setup manifest or authorization to change books.

The operator reports working production authentication, a transaction-ready dedicated replica set, an admin assigned to four companies, and completed company bootstrap. **Production was not queried. Actual account/period counts, existing balances, fiscal settings, indexes and prior entries are therefore unverified.** Company bootstrap alone creates no accounts, periods or journals; it does not establish that nobody has subsequently created them. No production URL, ERP or QuickBooks connection was used. The original audit changed documentation only; the subsequent governance implementation is recorded below. The pre-existing `src/app/globals.css` and `src/components/finance-page.tsx` edits are unrelated and preserved.

## Account governance implementation update

The account-governance foundation is now implemented locally, pending review. The original audit in section 1 and its gap list describe the pre-change baseline; this update supersedes their account-governance findings. The 67-row COA remains a proposal only. No production accounts or periods were created.

- Added backward-compatible controlAccount (false), allowManualPosting (true) and revision (zero) defaults. New explicitly designated controls default to nonmanual unless a manual exception is supplied; existing missing fields remain normal legacy behavior without migration.
- Added audited, revision-checked account.edit for name, subtype, active, parent and governance flags. Parent changes validate company/type and reject cycles. Code and type are immutable for every account, a deliberately stronger rule than locking only after usage. No delete action exists.
- Deactivation does not require zero balances or zero drafts: it preserves history and immediately blocks new manual/source postings, including pending drafts. Review those balances/drafts operationally; audited reactivation remains available. Exact historical reversals remain permitted, including inactive/nonmanual accounts, because the server copies only opposite original lines.
- Manual restrictions are checked on draft creation/edit and again at posting. Source access derives from an authenticated service principal and server-written journal postingOrigin, not sourceSystem text. Source drafts may use active control/nonmanual accounts but still require human posting. Legacy source classification uses server-written service attribution, not source labels.
- The existing COA UI now displays control/manual policy and supports editing, activation/deactivation, parent choice and a required change reason. Control selection suggests nonmanual policy with an explicit override. Manual journal selectors exclude unavailable accounts and identify existing unavailable selections.
- Period behavior is unchanged. No migration/opening wizard, reconciliation subsystem, source connector, bulk COA creation or fiscal close/reopen feature was added.

See [accounting-core.md](architecture/accounting-core.md) for the exact service/API rules. Before initial COA creation, approve the applicable subset, immutable codes/types, company context and manual-policy exceptions. Before financial ingestion, separately resolve opening balances/history, valuation, cutoff and control reconciliation. This change does not grant deployment or setup authorization.

## 1. Original audit implementation and evidence (before governance change)

| Source | What it establishes |
| --- | --- |
| `src/models/index.ts` | Company, Account, Period, Journal and Audit schemas/indexes |
| `src/domains/accounting/validation.ts` | Accepted account types/fields, dates, period ranges and balanced integer-cent journals |
| `src/domains/accounting/service.ts` | Account creation, period creation/closure, draft/edit/post/reversal and transactional audit |
| `src/domains/accounting/queries.ts` | Company-scoped journal retrieval and reversal link |
| `src/domains/reporting/service.ts` | Account/period overview, cumulative trial balance and general ledger |
| `src/app/api/finance/route.ts` | Authenticated read views and explicit mutation actions |
| `src/components/finance-console.tsx`; `src/components/finance-page.tsx` | Setup forms, company context, authentication gate and journal/report UI |
| `src/app/accounts/page.tsx`; `src/app/periods/page.tsx`; `src/app/companies/page.tsx` | Thin wrappers around the shared finance UI |
| `src/domains/companies/bootstrap.ts`; `scripts/bootstrap.ts`; `scripts/local/bootstrap.ts` | Company/index setup only; no accounting seeds |
| `tests/accounting.test.ts`; `tests/browser/finance.spec.ts` | Core accounting invariants, races, permissions and browser setup workflow |

### Chart of Accounts

- Account documents contain string UUID `_id`, `companyId`, `code`, `name`, `type`, `subtype`, optional `parentId`, `active`, creator/updater attribution and timestamps. Balances are not stored on accounts.
- The service validates exactly five types: **Asset, Liability, Equity, Revenue, Expense**. COGS, other income, contra assets and retained earnings are not separate types. `subtype` is optional free text, up to 100 characters, with no reporting or posting semantics.
- Code is trimmed, 1–30 characters; it need not be numeric and has no range or case normalization. Name is trimmed, 1–500 characters. The compound unique index `(companyId, code)` prevents exact duplicates within a company, assuming bootstrap-created indexes exist. The same code can be used in different companies. Case variants and inconsistent padding are not normalized. Codes sort lexically; use fixed-width four-digit numeric codes by convention.
- Mongoose's account business fields are permissive strings/booleans, without matching type enums/required validators. Strict mode rejects unknown fields, but service validation is the principal business boundary. Direct DB writes could bypass it; do not use them as setup tooling.
- `active` defaults to true in the service's Zod schema. API creation can explicitly set false; UI creation cannot. There is **no account edit, activate, deactivate or delete service/API/UI**.
- API creation supports a parent from the same company and same type. It does not require an active parent. There is no hierarchy editor, tree rendering, parent rollup, nonposting parent rule or depth policy. Parent accounts themselves can receive postings. New UUIDs plus an existing-parent requirement prevent self-parenting during current creation; any future editing needs cycle validation.
- New/edited drafts and normal posting require all accounts to be active and in the selected company. Reversal copies an already posted journal's account IDs and **does not rerun `accountsValid()`**, allowing correction of a historical inactive account. Treat this as an explicit reversal-policy decision before adding deactivation/control enforcement, rather than silently changing it.
- No control-account, manual-posting, normal-balance, reconciliation, currency-per-account, opening-balance, retained-earnings, tax mapping or ERP mapping field exists. Every active account is presently selectable for manual journal entry, regardless of name/type/subtype.
- Account creation and its `account.create` audit entry commit together. Audit includes the new document in `after`, the account name as reason, UUID, company, `human:<actor ID>` attribution and timestamps. No edit audit exists because editing does not exist. There is no audit-log UI/export workflow.

### Periods and fiscal year

- A period has UUID, company, inclusive `startDate`/`endDate` strings (`YYYY-MM-DD`), status **open or closed**, attribution/timestamps and optional `closedAt`/`closedBy`.
- Company defaults/bootstrap specify USD and `fiscalYearStart="01-01"`. There is no fiscal-year entity or period-to-year association. No accounting logic consumes fiscalYearStart to enforce boundaries, generate months or close a year. An existing company's different setting would be preserved by bootstrap and must be reviewed later.
- Valid calendar dates and start <= end are required. Any length is accepted, including one day, a month, a year or a range spanning years. Inclusive overlap is rejected even against closed periods. Adjacent months are valid; gaps are allowed. The exact-range unique index alone cannot stop partial overlap; the transactional service check and shared company write lock do that.
- **Creation immediately opens the period.** The schema defaults to open, and create input exposes no status. There is no planned, future, locked or adjustment-period state. No fiscal year/month bulk-generation workflow exists.
- Posting requires an open period containing the journal's **transactionDate**, not its postingDate. postingDate is the current UTC date and postedAt is a timestamp. Future-dated posting is allowed if a future period is open. Draft creation/editing does not require an open period; a closed period can still have drafts.
- Closing changes open to closed, captures closedAt/closedBy/updatedBy, and writes a `period.close` audit with required reason. The close audit does not include before/after snapshots. Period creation audit includes `after` and reason “Create accounting period.” All occur inside the company transaction.
- Close does not check unresolved drafts, bank/subledger reconciliations, unprocessed ERP items, earlier periods, approvals or year-end entries. `finance:write` humans can close; there is no separate close permission or dual approval.
- There is **no reopen, period-date edit, deletion, permanent lock, or year-end procedure**. Creating a replacement period cannot bypass a closed period because overlap is blocked. A prior-period correction can be posted by reversal into another open period; it does not restate the old period. Original and reversal remain visible.
- Financial writes increment the active company's `lockVersion` within a snapshot/majority transaction, serializing posting against closure. This field is concurrency control, not a fiscal lock status.

### Opening balances, reports and year end

The only current balance mechanism is a posted, balanced journal in integer cents (2–500 lines, exactly one positive debit/credit per line). There is no opening-balance wizard, independent opening-balance field, AR/AP aging/subledger import, bank reconciliation, inventory valuation ledger or fixed-asset register.

Trial balance sums **all posted history through the as-of transaction date**, without fiscal-year reset. General ledger includes earlier entries in running balances but displays only rows within the requested date range; an account with only earlier activity may have no visible row in that range. Neither automatically transfers profit to retained earnings. Period closure does not generate closing journals. There is no income statement, balance sheet, cash-flow statement, hierarchy rollup or separately presented current-year earnings.

An account called “Retained earnings” is an ordinary Equity account. Do not use it as an unexplained opening plug or transfer current-year income into it at a midyear cutoff. Year-end closing/reopening/report treatment needs a separately reviewed design. Because there is no non-overlapping thirteenth period or closing-entry exclusion, ordinary closing journals would affect ordinary date-range activity; do not add them casually.

### Current setup UI/API

| Task | Available today | Limitation |
| --- | --- | --- |
| Select company | Explicit assigned-company dropdown and `?company=` context, carried across links; no implicit default | All-company admin must deliberately select `pioneer-industries`; server still validates membership |
| View COA | `/accounts?company=pioneer-industries`: code, name, type, subtype, active/inactive | No hierarchy, balances, search/filter, audit view or export |
| Create account | Code/name/type/subtype form; POST `/api/finance` action `account.create` | One account at a time; always active through UI; parent/active available only in API input |
| Edit/deactivate account | None | Even a spelling correction needs a future supported mutation; do not fix directly in MongoDB |
| View periods | `/periods?company=pioneer-industries`: ranges/status, descending dates | No fiscal-year grouping or close readiness |
| Open period | “Open a period” form creates a new open range; action `period.create` | It does not reopen an existing period |
| Close period | Required reason and browser confirmation; action `period.close` | No reopen; no unresolved-work checks |
| Opening entries | Ordinary journal draft/review/post UI | No migration metadata, reconciled balances or special reporting treatment |

Overview GET `/api/finance?company=pioneer-industries` returns all accounts/periods and the latest 100 journals plus draft/posted counts. That 100-row list is not a complete historical audit. Report endpoints support trial-balance and general-ledger views. API commands require human write scope for setup; read-only users/services cannot create accounts or periods. All calls are company-scoped; no consolidated cross-company books are created.

Tests cover duplicate accounts, same code across companies, cross-company parents/lines, inactive-account rejection, attribution, balanced journals, invalid dates, overlapping/closed/missing periods, revisions, immutable posting, reversals, source deduplication, report opening/running balances, service limits and concurrent closure/posting. They do not establish nonexistent edit/control/year-end/migration workflows, nor prove production records or indexes are correct.

## 2. Proposed Pioneer Industries COA

This is a proposed **accrual-oriented management ledger**, not a determination of Pioneer's legal entity, tax elections, existing accounting method or balances. Confirm those and the cutoff with the accounting owner before approving setup. Do not assume QuickBooks account names/codes or import them. The table's three-way Manual policy is a planning designation: the implemented boolean allows or blocks manual posting; it does not yet provide a separate adjustment-only permission. Any manually allowed control-account exception is available to authorized finance writers and must be approved accordingly.

Use 1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx revenue, 5xxx direct costs, 6xxx operating expenses, 7xxx other income and 8xxx other expense. Start flat: no dummy parent/header accounts. Keep codes stable and map ERP events to company-specific UUIDs after creation. Create only applicable accounts; rows marked conditional are reserved proposals, not instructions to populate everything.

**Control** means an eventual reconciliation/control relationship with a subledger, bank statement or supporting schedule. This is a design designation, not a capability the app currently enforces. **Manual**: “No” means normal manual journals should be blocked after policy implementation; “Restricted” means approved, documented accounting adjustments/opening entries only; “Yes” means normal reviewed manual journals are suitable. No posting permission is conferred by this table. Even “No” needs a future privileged correction/migration path with reconciliation, not a blanket bypass via sourceSystem text.

| Code | Name | Type | Purpose | Control | Manual | Future integration / condition |
| --- | --- | --- | --- | --- | --- | --- |
| 1000 | Operating bank | Asset | Main cash balance | Yes | Restricted | Bank reconciliation; one account per actual bank account |
| 1010 | Payroll bank | Asset | Separate payroll cash, if used | Yes | Restricted | Conditional separate real bank account; never duplicate 1000 |
| 1020 | Undeposited funds / payment clearing | Asset | Receipts awaiting settlement | Yes | No | Payment batches clear to bank; reconcile by payment/settlement |
| 1030 | Petty cash | Asset | Physical cash, if used | Yes | Restricted | Conditional custodian reconciliation |
| 1100 | Trade accounts receivable | Asset | Amounts owed by customers | Yes | No | Invoice/customer aging; one receivable event per invoice |
| 1110 | Allowance for credit losses | Asset | Contra-AR valuation allowance | Yes | Restricted | Conditional approved estimate/write-off policy; credit-normal |
| 1200 | Parts inventory | Asset | Owned parts held for sale or repairs | Yes | No | ERP quantity and approved cost valuation, not retail prices |
| 1210 | Equipment inventory | Asset | Owned equipment held for resale | Yes | No | Conditional; distinguish from equipment used by Pioneer |
| 1220 | Repair work in process | Asset | Qualifying uncompleted job costs | Yes | No | Conditional on approved job-cost/WIP policy; not all technician time |
| 1290 | Inventory obsolescence allowance | Asset | Contra-inventory valuation | Yes | Restricted | Conditional approved reserve; reconcile gross/net inventory |
| 1300 | Prepaid insurance | Asset | Coverage paid ahead | Yes | Restricted | Prepaid schedule releases to 6200 |
| 1310 | Other prepaid expenses | Asset | Rent/software/other prepaid costs | Yes | Restricted | Schedule-based amortization, no blanket capitalization |
| 1400 | Deposits | Asset | Refundable lease/utility deposits | Yes | Restricted | Supporting deposit schedule |
| 1500 | Shop and test equipment | Asset | Capital equipment used in repair operations | Yes | Restricted | Fixed-asset register; capitalization policy needed |
| 1510 | Furniture and computers | Asset | Capitalized office/IT assets | Yes | Restricted | Register; expense below-policy purchases appropriately |
| 1520 | Vehicles | Asset | Owned capital vehicles | Yes | Restricted | Conditional register; distinguish financed/leased treatment |
| 1590 | Accumulated depreciation | Asset | Contra fixed assets | Yes | Restricted | Credit-normal; approved depreciation schedule |
| 2000 | Trade accounts payable | Liability | Vendor obligations | Yes | No | Vendor bill/payment aging |
| 2010 | Goods received not invoiced | Liability | Inventory receipt/bill timing | Yes | No | Conditional perpetual inventory clearing; match receipt to bill |
| 2100 | Credit card payable | Liability | Card balance | Yes | Restricted | One account per actual card statement; card payments are transfers |
| 2200 | Wages payable | Liability | Earned unpaid payroll | Yes | No | Payroll register/accrual and net-pay clearing |
| 2210 | Payroll taxes payable | Liability | Withholdings and employer payroll taxes owed | Yes | No | Payroll tax reconciliation; split by agency as needed |
| 2220 | Benefits and deductions payable | Liability | Benefit/retirement deductions owed | Yes | No | Conditional payroll/provider reconciliation |
| 2300 | Sales tax payable | Liability | Customer taxes collected for remittance | Yes | No | Tax-jurisdiction rules and exemptions require approved mapping |
| 2400 | Accrued expenses | Liability | Received services/costs not yet billed | Yes | Restricted | Accrual schedule, avoid duplicate vendor-bill expense |
| 2410 | Customer deposits / deferred revenue | Liability | Payments before earning revenue | Yes | No | Conditional deposits, job fulfillment and revenue-release events |
| 2500 | Current portion of notes payable | Liability | Debt principal due within current classification horizon | Yes | Restricted | Per-loan schedules, separate principal from interest |
| 2600 | Long-term notes payable | Liability | Remaining long-term debt principal | Yes | Restricted | Per-loan schedules; annual/current reclassification |
| 3000 | Contributed capital | Equity | Owner/shareholder capital invested | Yes | Restricted | Final name/subaccounts depend on legal entity |
| 3100 | Owner distributions / dividends | Equity | Distributions, not operating expenses | Yes | Restricted | Conditional entity-appropriate terminology and approval |
| 3200 | Retained earnings | Equity | Approved accumulated prior-year earnings | Yes | Restricted | Reconciled migration and future year-end process only |
| 3900 | Opening balance clearing | Equity | Temporary migration balancing control | Yes | Restricted | Conditional migration-only; must be zero before acceptance, never permanent plug |
| 4000 | Repair and service labor revenue | Revenue | Earned repair/service fees | No | Restricted | ERP service labor lines; recognized once at approved trigger |
| 4100 | Parts sales revenue | Revenue | Separately charged parts | No | Restricted | ERP parts lines, separate associated inventory cost |
| 4200 | Equipment sales revenue | Revenue | Owned equipment sold | No | Restricted | Conditional equipment sale lines; distinguish fixed-asset disposals |
| 4300 | Freight billed to customers | Revenue | Shipping charges billed | No | Restricted | Conditional explicit invoice charge mapping |
| 4400 | Sales returns and discounts | Revenue | Contra-revenue reductions | No | Restricted | Credit memos/discounts; debit-normal, retain product/category attribution |
| 4900 | Other operating revenue | Revenue | Defined incidental earned revenue | No | Restricted | Explicit approved event types, never catch-all for unknown ERP codes |
| 5000 | Parts sold — cost of goods sold | Expense | Cost of standalone parts sales | No | No | ERP costed issue event debits here and credits 1200 |
| 5010 | Parts used in repairs | Expense | Parts consumed on completed/expensed repair jobs | No | No | Costed job consumption; do not also charge 5000 for same issue |
| 5020 | Equipment sold — cost of goods sold | Expense | Cost of resale equipment | No | No | Conditional; credit 1210 on approved release |
| 5100 | Direct repair labor | Expense | Technician wages attributable to repair work | No | Restricted | Payroll/job allocation; exclude these wages from 6000 |
| 5110 | Direct labor payroll burden | Expense | Allocated employer taxes/benefits on direct labor | No | Restricted | Conditional approved allocation; no duplicate 6010/6020 charge |
| 5200 | Outside repair services | Expense | Subcontracted job work | No | Restricted | Vendor job-cost lines; WIP treatment only if approved |
| 5300 | Inventory adjustments and shrinkage | Expense | Approved count/cost losses | No | Restricted | ERP count adjustments with reason and approval |
| 5400 | Direct shop consumables | Expense | Expensed repair/test consumables | No | Yes | Noninventory supplies; avoid duplicating tracked parts issues |
| 6000 | Administrative and indirect wages | Expense | Payroll not included in direct repair labor | No | Restricted | Payroll allocation with full gross-wage reconciliation |
| 6010 | Employer payroll tax expense | Expense | Employer taxes not allocated to direct burden | No | Restricted | Employee withholding is liability, not extra expense |
| 6020 | Employee benefits | Expense | Employer benefits not allocated to direct burden | No | Restricted | Payroll/provider bills; employee deductions are liabilities |
| 6100 | Rent | Expense | Facility rent | No | Yes | Vendor/prepaid releases; leases reviewed separately |
| 6110 | Utilities | Expense | Electricity, water and other utilities | No | Yes | Vendor/bank mapping |
| 6200 | Insurance | Expense | Business coverage expense | No | Yes | Expense/release from prepaid schedule |
| 6300 | Repairs and maintenance | Expense | Maintenance of Pioneer's own assets | No | Yes | Distinct from customer repair costs and capital improvements |
| 6400 | Office and administrative supplies | Expense | General office costs | No | Yes | Vendor/card mapping |
| 6410 | Professional fees | Expense | Accounting/legal/consulting | No | Yes | Vendor/card mapping |
| 6500 | Software and technology | Expense | Subscriptions, hosting, IT services | No | Yes | Prepaid/capital treatment reviewed where relevant |
| 6600 | Vehicle operating expense | Expense | Business fuel, service and operating costs | No | Yes | Vendor/card; vehicle purchase/principal not expense |
| 6610 | Travel | Expense | Business travel | No | Yes | Expense reports; separately tag meals/tax treatment later |
| 6700 | Depreciation expense | Expense | Periodic fixed-asset allocation | No | Restricted | Debit here, credit 1590; approved book depreciation schedule |
| 6800 | Freight and delivery expense | Expense | Outbound shipping | No | Yes | Carrier bills; inbound capitalizable freight follows inventory policy |
| 6810 | Bank and merchant fees | Expense | Banking/payment processing costs | No | Yes | Settlement differences reconciled to gross customer receipts |
| 6900 | Business taxes and licenses | Expense | Property/business taxes and license fees | No | Yes | Excludes collected sales tax, employee withholding and owner personal tax |
| 7000 | Interest income | Revenue | Earned bank/other interest | No | Restricted | Bank mapping, separate from customer revenue |
| 7100 | Other nonoperating income | Revenue | Approved incidental gains/income | No | Restricted | Conditional; explicit classification, not unknown-event fallback |
| 8000 | Interest expense | Expense | Financing interest | No | Restricted | Loan/card schedule; principal reduces debt |
| 8100 | Entity income tax expense | Expense | Entity-level income taxes, if applicable | No | Restricted | Conditional on legal/tax structure; not owner's personal taxes |
| 8900 | Miscellaneous expense | Expense | Small genuinely uncategorized costs pending review | No | Restricted | Period-close review; recurring items get correct classification |

Keep gross revenue, customer tax, receipts and COGS separate. Do not count customer-owned oxygen equipment under repair as Pioneer inventory or fixed assets. Track it operationally in ERP. Do not create product-, customer-, serial-number- or invoice-specific GL accounts; those are future subledger dimensions. Related-company activity should eventually use distinct due-to/due-from accounts and reciprocal entries per entity, never cross-company journal lines.

Direct labor in 5100 is useful for repair margin reporting. It does not by itself mean labor is capitalized into inventory/WIP. Approve allocation and recognition policy first; nonallocated wages stay in 6000. No costing method, reserve amount, useful life, tax election or sales-tax applicability is assumed here.

Reference context: the IRS describes accounting periods/method choices and inventory considerations in [Publication 538](https://www.irs.gov/publications/p538), and discusses inventory/material/labor cost distinctions in [Publication 334](https://www.irs.gov/publications/p334). These tax references do not prescribe this proposed COA or establish Pioneer's entity-specific treatment. The codes/control flags above are application design recommendations, not imported accounting rules.

## 3. Historical period proposal — superseded

Use calendar FY **2026, January 1–December 31**, consistent with the source default, pending confirmation of the actual company record and accounting policy. Plan twelve calendar months, not one full-year period: an annual period would overlap and prevent subsequently creating monthly periods.

For planning, propose the next full month, **October 1, 2026**, as an earliest candidate live cutoff, not a committed go-live date. If prerequisites are not complete, move to a later first-of-month. **During this audit/design phase open no periods.** After approved setup, open only the actual cutover month; do not open all elapsed/future months merely to satisfy a template. Do not close a period as a temporary pause: there is no reopen action.

| Planned month | Start | End | Proposed handling for an October 1 cutoff |
| --- | --- | --- | --- |
| January | 2026-01-01 | 2026-01-31 | History plan only; do not create yet |
| February | 2026-02-01 | 2026-02-28 | History plan only; do not create yet |
| March | 2026-03-01 | 2026-03-31 | History plan only; do not create yet |
| April | 2026-04-01 | 2026-04-30 | History plan only; do not create yet |
| May | 2026-05-01 | 2026-05-31 | History plan only; do not create yet |
| June | 2026-06-01 | 2026-06-30 | History plan only; do not create yet |
| July | 2026-07-01 | 2026-07-31 | History plan only; do not create yet |
| August | 2026-08-01 | 2026-08-31 | History plan only; do not create yet |
| September | 2026-09-01 | 2026-09-30 | Cutoff reconciliation/history plan; do not create merely for an opening plug |
| October | 2026-10-01 | 2026-10-31 | Open only at approved live setup; otherwise leave uncreated |
| November | 2026-11-01 | 2026-11-30 | Defer until needed; optional planned state only after enhancement |
| December | 2026-12-01 | 2026-12-31 | Defer until needed; year-end design required before close |

These are planned ranges, not existing DB records or supported “planned” statuses. With current code, do not precreate November/December or FY2027: they would immediately permit posting. For a backdated live cutoff, open only the explicitly approved catch-up months temporarily, then close after reconciliation. No date should be picked from the server clock without owner approval.

### Opening balances and history must be decided before live ingestion

1. Obtain an approved cutoff trial balance and supporting bank, customer, vendor, inventory-cost, asset, debt, payroll/tax and equity schedules through a later authorized migration exercise. Do not assume zeros because the GL is new. No amounts are proposed here.
2. Reconcile opening debits/credits and each control account; identify ownership of open invoices/bills/payments and uncompleted jobs. These open items may predate the event cutoff and still need later settlement without booking their revenue/cost again.
3. **A midyear cutoff is not just a balance-sheet import.** Preserve current-year income/expense history or explicitly designate reports as post-cutoff only. Do not move 2026 YTD profit into prior-year retained earnings. A cumulative September 30 trial balance posted as an ordinary October 1 journal would contaminate October activity; current reports have no opening-entry exclusion. Likewise, stamping YTD amounts into September would not produce truthful monthly history.
4. Prefer approved prior-year closing balances plus separately reconciled 2026 monthly movements if full FY2026 comparatives are required, before live cutover. This needs a controlled migration/reporting design, not a single setup journal. Alternatively defer complete system-of-record cutover to January 1, 2027 with approved 2026 closing balances; 2026 stays in the incumbent ledger. If only post-cutoff reporting is accepted, define opening-entry presentation and its limitations before importing anything.
5. Do not later import historical detail on top of opening/YTD summaries. Choose a documented replacement/reconciliation approach and unique migration source identities; existing posted entries cannot be edited/deleted through the app. Preserve the incumbent records until a separately reviewed migration succeeds.
6. Opening balance clearing 3900, if used during approved migration, must reconcile to zero before acceptance. It is not a long-term suspense balance. No automatic year-end close or retained-earnings transfer is currently available.

Close a month only after bank/payment, AR/AP, inventory, payroll/tax, debt and draft/source-queue reconciliations applicable to that month are complete. The UI does not perform these checks for you. Ingestion into a closed month must be held for review, never silently re-dated to the next open month. Corrections need a reviewed open-period reversal/adjustment or future governed reopen policy.

## 4. Future ERP and other integration mapping

These entries are illustrative accrual mappings, not executable payloads or a finding about ERP's current event schema.

| Source/event | Proposed debit | Proposed credit | Boundary/reconciliation |
| --- | --- | --- | --- |
| Earned repair invoice | 1100 gross receivable | 4000 service, 4100 parts, applicable 4300 freight, 2300 collected tax | Split net lines/tax; agree service completion/revenue trigger, discounts and credit memos |
| Standalone parts invoice | 1100 | 4100 and applicable 2300/4300 | Recognize sales once, separately from cost |
| Equipment resale invoice | 1100 | 4200 and applicable tax/freight | Owned resale equipment only |
| Customer payment | 1020 or actual bank | 1100 | Allocate to invoices; never recognize invoice revenue again |
| Payment settlement | 1000 net cash and 6810 fees | 1020 gross settlement | Match processor/bank batch; separate timing/refunds/chargebacks |
| Prepayment before earning | 1020/1000 | 2410 | Later apply deposit/release liability without double-counting cash or AR |
| Parts sold / consumed in repair | 5000 / 5010, or approved 1220 WIP | 1200 | ERP must provide approved cost, not sales price; exactly one cost release per quantity event |
| WIP completion, if adopted | Appropriate direct-cost account | 1220 | Prevent both immediate expense and later WIP release for same cost |
| Equipment inventory sold | 5020 | 1210 | Costed owned units |
| Inventory receipt before invoice | 1200/1210 | 2010 | If GRNI model adopted; bill then debits 2010, credits 2000; don't capitalize twice |
| Vendor bill without prior receipt accrual | Expense/prepaid/asset/inventory as applicable | 2000 | One approved acquisition model per event; support vendor aging and due dates |
| Vendor payment | 2000 | 1000 | Match bills; do not expense twice |
| Payroll accrual/register | 5100/5110 or 6000/6010/6020 | 2200/2210/2220 as applicable | Reconcile gross wages, employer cost, deductions and net pay; no double allocation |
| Payroll disbursement/remittance | Respective payroll liabilities | 1000/1010 | Clear register balances, not a second wage expense |
| Card purchase/payment | Expense/asset then 2100 | 2100 then 1000 | Statement reconciliation; payment is liability reduction |
| Loan payment | 2500/2600 principal and 8000 interest | 1000 | Schedule split; approved current/long-term reclassification |
| Bank transfer | Destination cash account | Source cash account | No revenue/expense; pair feed records without duplicate journal |

The current service path can create a balanced draft using `finance:source:write`; it cannot post it. Preserve that human review boundary for the first integration. Each draft needs explicit `companyId`, `sourceSystem`, `sourceType`, `sourceId`, `sourceRevision` and mapped account UUIDs. The compound source index and hash deduplicate identical deliveries; changed content under the same identity conflicts.

**A new sourceRevision creates a separate draft; it does not supersede/reverse the prior posted revision.** A later connector must explicitly handle corrections, cancellations, partial payments, returns and reversals without double posting. There is no outbox/connector, account mapping registry, item valuation API, AR/AP subledger or ERP schema contract here. Reject/quarantine unknown mappings rather than send them to miscellaneous income/expense. Never authorize control-account access solely because an untrusted request sets a chosen sourceSystem string.

Define the ownership split before coding: ERP supplies operational invoice/job/quantity facts; FinanceAgent owns reviewed ledger postings; approved payroll/bank/vendor sources own their respective facts. Maintain bank-versus-payment matching and bill-versus-receipt matching so multiple integrations cannot recognize the same business event twice. Mapping changes must be versioned and company-scoped.

## 5. Smallest safe next implementation and setup sequence

**Recommended next implementation: a bounded “Pioneer account setup safeguards” change, before mass account creation or any ERP feed.** No tiny defect presently prevents creating an account or monthly period, so this audit makes no code fix.

1. Add explicit account policy metadata (`controlKind`/reconciliation purpose and manual-posting policy) with server validation and audited enforcement in draft creation/edit, normal posting and reversal. Define a narrow human adjustment/migration permission rather than trusting free-text source fields. Decide how reversals of inactive/control accounts work without preventing legitimate correction.
2. Add audited account name/subtype editing and activation/deactivation with a reason and optimistic revision check. Keep posted account type/code immutable initially; no deletion. Prevent deactivation of accounts with unresolved drafts/nonzero balances until a reviewed policy exists. No hierarchy editor is necessary for this flat initial COA.
3. Extend the existing `/accounts` form/list with those fields, conspicuous company name/ID and edit/deactivate actions. A new wizard/connector is unnecessary. Use a reviewed flat manifest or one-at-a-time entry after approval. If bulk setup is later added, require preview/diff, exact-match rerun handling, reject conflicting existing codes, and call the same audited services; never raw collection inserts or automatic startup seeding.
4. Add tests for wrong-company updates, read-only/service denial, stale edits, immutable used codes/types, control/manual restrictions at every posting path, inactive-account correction policy, and no partial mutation when audit fails. These are new feature acceptance tests, not claimed current coverage.

Separately, the smallest period UI safety improvement is clear “Create and open period” labeling, explicit company/range confirmation, an irreversible-close warning and display/check of unresolved drafts before closure. Keep one-at-a-time creation for the cutover month. If the owner wants all twelve periods created in advance, add a real **planned -> open -> closed** service/API state machine first; do not abuse closed as planned. Governed reopening/permanent locking needs dedicated permissions, required reasons, before/after audit and concurrency tests, and can be a separate change rather than a prerequisite for initial account creation.

After implementation review, the future setup sequence is:

1. Authorized read-only inventory of actual `pioneer-industries` accounts, periods, journals, company fiscal setting and indexes; reconcile any existing setup instead of assuming an empty database. Inspect complete history, not only the 100-entry overview.
2. Accounting-owner approval of applicable COA rows, entity-specific equity/tax treatment, bank/card/loan splits, valuation/direct-labor policies, cutoff and opening/history strategy.
3. Separately authorized account creation through supported audited services/UI, only for Pioneer Industries. Review the resulting list and company assignments before opening dates for posting. Keep the other three companies unchanged.
4. Explicitly approved migration/opening design and reconciliation; choose period creation dates accordingly. Withhold ERP production ingestion until opening/control balances and report interpretation are accepted.
5. Open only approved periods, test permissions/reconciliation and duplicate/correction scenarios in disposable staging, then seek separate authorization for the production integration. No auto-bootstrap or scheduled setup mutation.

## Governance validation (September 14, 2026)

Root `npm ci` encountered the existing Windows lock on lightningcss's native binary. A clean `npm ci` succeeded in ignored `.local/governance-audit-12e9fb9`, containing the changed source without runtime env files. Typecheck, lint, **131 tests**, production build and **5 HTTPS browser tests** passed there. The build emitted only the nested workspace-root warning. Missing root dependency files were restored without overwriting existing/locked files; `npm ls --depth=0` passed. No running application/service was stopped.

Thirteen additional integration tests cover default compatibility, audit rollback, concurrent/stale edits, control defaults, deactivation/reactivation, historical reports, manual/source policy and provenance, exact reversals, company/actor authorization, immutable used codes/types and parent cycles. The added browser scenario covers create defaults/reset, control labels, manual exclusion and edit/deactivate/reactivate/explicit override. Period behavior and existing idempotency tests remain unchanged. All databases/users in validation were disposable fixtures; production and persistent accounting data were not accessed. Changes remain uncommitted for review.

## 6. Original audit validation

The requested `npm run typecheck`, `npm run lint`, `npm test` (**118 tests passed**) and `npm run build` passed locally. Validation used `.local/accounting-audit-12e9fb9`, an ignored source copy without environment files, using the installed dependencies and disposable fixture databases. The build emitted a nested workspace-root/multiple-lockfile warning but compiled and generated all routes successfully. `git diff --check` also passed. Existing tests create their own temporary accounting fixtures; no persistent/production bootstrap or setup command was run. No new code or tests were added for this documentation-only audit.

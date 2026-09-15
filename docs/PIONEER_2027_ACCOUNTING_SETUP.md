# Pioneer accounting foundation and 2027 setup

The user has reviewed and configured Pioneer's COA. This change does not reclassify any existing accounts or access production. QuickBooks remains official through **12-31-2026**. FinancialAgent's planned authoritative start is **01-01-2027**, subject to reconciled balances and explicit business sign-off. Dates in API/storage remain ISO; UI dates use MM-DD-YYYY.

## Account governance

`postingAccount` is independent of `controlAccount` and `allowManualPosting`:

| Posting | Control | Manual | Meaning |
| --- | --- | --- | --- |
| No | Either | No | Organizational header; no new journal lines |
| Yes | No | Yes | Ordinary manually postable account |
| Yes | Yes | No | Source/subledger control; human manual journals prohibited |
| Yes | Yes | Yes | Control with explicitly permitted manual adjustments |

New ordinary accounts default to posting=true, control=false, manual=true. New headers default manual=false; explicit manual=true on a header is rejected. Existing records without postingAccount remain posting accounts without migration or write-on-read. A control flag never grants a posting bypass. Source credentials can create drafts against active posting controls even when manual=false, but cannot post journals or use headers.

Create/edit forms expose all three choices. Unchecking Posting account clears/disables manual posting. Parent selection uses same-company/same-type accounts; the server preserves ancestor/cycle validation. The COA indents children and labels headers **Header / Non-Posting**. Parentage alone does not prohibit posting or roll up report balances. Existing accounts are changed only by an authorized human through revision-checked edits with a required reason and transactional before/after audit.

Conversion to a header is rejected while any company draft references the account, including source drafts. Resolve drafts legitimately before conversion; there is no new cancel/source-correction workflow. Company transaction locking prevents a concurrent draft from slipping past conversion. Posted history/balances remain unchanged; conversion does not require zero balance and is not a way to move historical balances to children.

All new manual/source drafts, manual edits and final posting reject explicit postingAccount=false. Normal manual selection also excludes inactive/manual-disabled accounts. Exact identical source retries can return an already accepted record after policy changes; this does not permit posting a blocked draft.

**Historical reversal exception:** the dedicated reversal service may use the original historical accounts after they become nonposting, inactive or manual-disabled. Only a human with company finance:write may request it, with reason and an open target period. Lines are copied exactly with debit/credit swapped; callers cannot substitute accounts or amounts. One linked posted reversal is allowed, the original is immutable, and reversal/audit commit together. This exception never applies to ordinary draft/post paths.

## Explicit 2027 monthly setup

In `/periods?company=pioneer-industries`, review **Pioneer Industries · 2027 accounting setup**, expand the twelve-month preview, supply a reason and confirm **Create missing 2027 periods**. This invokes POST `/api/finance`, action `period.setup2027`, companyId `pioneer-industries`, reason. Existing authentication, mutation-origin checks, human finance:write and company membership are required; services/readers are denied. The company must have fiscalYearStart=01-01.

The entire operation runs in one transaction using ordinary period validation and per-period creation audits. It creates January through December 2027 inclusive, February ending 02-28-2027. Exact existing monthly periods, open or closed, are preserved without date/status/attribution changes. Any nonexact overlap with 2027 aborts the whole operation. A repeat creates no duplicate periods or audits. Company serialization metadata can advance on a successful no-op. Other companies and all nonoverlapping historical periods remain unchanged.

**All newly created periods are OPEN.** The current domain has only open/closed, no planned state or reopen workflow. Future dates are postable when their period is open. Do not close months as a temporary pause. Operators who are not ready to open all missing months should defer this batch action and use ordinary single-period creation as individually approved. Setup does not close periods, create 2026 periods, seed balances, run at startup, or activate accounting authority. No setup was executed against persistent books in this development task.

## Cutover prerequisites (migration is not implemented)

Preserve and reconcile the 12-31-2026 QuickBooks Trial Balance, bank balances, AR and individual open customer invoices, inventory, fixed assets and accumulated depreciation, AP and individual open vendor bills, credit cards, loans, payroll/tax liabilities, equity and retained earnings. Reconcile detailed schedules to control totals and independently approve account/company mappings and source identities.

Future opening AR/AP items must preserve remaining balances and external identities **without recreating 2026 revenue or expense or double-counting control balances**. Opening-entry/report presentation, year-end earnings treatment, migration batches and rollback require a separate reviewed design. Do not enter a balancing plug or import history through ordinary journals as a shortcut. Preserve QuickBooks history and exports; no 2026 import is authorized here.

## Manual development acceptance procedure

Use only a confirmed isolated development database, with a human authorized for Pioneer Industries. Do not run this procedure on production or automate the journal. Use existing appropriate accounts; do not assume any account IDs/codes. Record baseline Trial Balance and General Ledger before starting.

1. Choose an existing active posting, manually allowed, non-control cash/asset account and an existing active posting, manually allowed, non-control revenue/equity account suitable for this development test. Do not use AR, AP, inventory, payroll liabilities or another control account. If suitable accounts/open periods are unavailable, stop and arrange separate approved development setup.
2. In Journal, create a draft dated within an existing open development period, with a clear acceptance-test description: debit the chosen asset **100.00 dollars**, credit the other account **100.00 dollars**. Do not enter 10000 in dollar fields. Review both accounts, date, source identity and balanced totals before saving.
3. Open the draft detail, verify each side is $100.00, then Post. Confirm the posted original cannot be edited. Trial Balance as of the transaction date must remain balanced, with the expected $100 changes relative to baseline.
4. View General Ledger for the date range and each selected account; confirm both original lines and their linked journal. Reports use transaction dates, not processing timestamps.
5. From the posted original, request Reverse with a meaningful reason and a date in an open development period. Review the equal/opposite linked posted entry. Confirm the original still has its original lines/timestamps and a reversal link; verify reversal attribution/reason in the audit record through approved development inspection if needed (no audit-browser UI exists).
6. Run Trial Balance through the reversal date and General Ledger including both dates. These two entries must net to zero against the recorded baseline; both must remain visible. A second reversal must be rejected. Reversal is a preserved correction, not deletion of the test history.

## Next AR task and limitations

The intended future flow remains: Pioneer ERP authoritative operational customer invoice → versioned FinancialAgent source contract → FinancialAgent AR record → accounting draft → controlled posting. FinancialAgent is planned to own financial AR/payment/settlement truth. Source identity, company scoping, revision fingerprints and idempotency remain intact. No AR, AP, banking, payroll, migration, customer/vendor master or ERP connector is implemented here.

The foundation supports beginning a separately scoped AR design/implementation. Before production intake, approve the source contract, control/revenue/tax mappings, correction/revision behavior, subledger reconciliation, posting authority and operational recovery. Current services require human final posting; system posting would need its own reviewed policy. Period existence alone is not a cutover gate. Reports still have no fiscal close automation, opening-entry classification or hierarchy rollup.

Review and deployment authorization remain separate. No database migration is needed for legacy posting defaults. **Do not roll back to an older writable release that ignores postingAccount after headers are configured**; suspend writes and retain a release enforcing this policy. Period creation cannot be undone through the app; do not delete records or close periods merely to simulate rollback. Preserve audited governance and posted history.

## Local validation — September 15, 2026

Typecheck, lint, all 184 tests across eight files, production build, all six browser scenarios and git diff --check passed. Twelve new accounting integration cases cover legacy defaults, header/manual/source policy, conversion races and pending drafts, immutable history/exact reversal, setup preservation/idempotency, overlap and audit rollback, concurrent setup, company authorization and fiscal-year validation. Two hierarchy tests cover ordering and malformed legacy ancestry. The added browser scenario verifies header creation, posting children, selector exclusion and explicit repeatable monthly setup; existing authentication and draft/post/report/reversal scenarios remain intact. The production-auth test's sign-in label was aligned with the separately edited page label, preserving every security assertion.

Database/browser validation used an ignored source snapshot without environment files and disposable replica-set fixtures. No acceptance journal, accounts or periods were created in persistent books; no production access, deployment, commit or push occurred. The nested validation build emitted only the multiple-lockfile workspace-root warning; the root production build also passed. Existing user sign-in-page edits were preserved.

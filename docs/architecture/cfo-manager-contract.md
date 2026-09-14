# Future CFO Manager contract

CFO Manager will live in Pioneer Managers. No CFO implementation is included here. FinancialAgent exposes authoritative company-scoped projections; Managers analyze and recommend.

Every response should carry company IDs, USD currency, asOf/cutoff, generatedAt, coverage/freshness, stable record references and reconciliation state where applicable. Missing data must be explicit rather than returned as fabricated zero. Require cfo:read plus company authorization when endpoints are introduced.

| Area        | Planned data                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------- |
| Cash        | Bank balances, available cash, ledger balances, reconciled/unreconciled status and timestamps |
| AR          | Open/overdue amounts, aging buckets, collections, settlement/application lineage              |
| AP          | Open AP, due within 7/14/30 days, scheduled payments and approval states                      |
| Obligations | Payroll, tax, loan and recurring payment liabilities, due/execution dates                     |
| Statements  | P&L, Balance Sheet, Cash Flow with accounting policy and cutoff                               |
| Trends      | Comparable periods, company comparisons, adjustments and coverage                             |

Trial Balance and General Ledger are implemented now. Cash, AR, AP, obligations and the other statements are future data contracts and are not simulated by the dashboard.

Initial reports remain single-company. Future selected-company views must authorize every requested company independently and label company contributions. Consolidation needs explicit account mapping, ownership, intercompany identification and approved eliminations. Do not describe a simple sum of separate books as consolidated statements. Each company's books remain isolated; any elimination ledger must have separate authority and audit.

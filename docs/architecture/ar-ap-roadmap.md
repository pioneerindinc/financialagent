# Future AR and AP

Neither AR nor AP is implemented. The shared company, exact-money, source-identity, journal and actor boundaries are the seams for future work.

AR will own imported invoice financial projections, original/paid/remaining amounts, customer payments, applications, credits, write-offs, unapplied cash and aging. Customer operational identity and source invoice remain in ERP. Applications must be atomic, company-scoped, idempotent and tied to approved accounting entries. Define credit/refund/cancellation behavior before enabling settlement.

AP will own imported bill financial projections, original/remaining amount, vendor payments, applications, scheduled payments, credits and aging. Vendor operational identity and source evidence remain in ERP. Payment creation, approval and execution are separate transitions; no execution adapter is present.

Scheduled payments must retain five separate concepts: bill due date, planned payment date, approved payment date, scheduled execution date, actual paid date. These must never be substituted for one another. Preserve approval actor/version and provider execution identity when payment capabilities are introduced.

Collections and Payables consume authoritative financial balances and applications through read projections. Neither manager becomes the settlement ledger. Obligations consumes due/scheduled financial states, while manual business obligations stay in Managers.

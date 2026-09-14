# Future banking

No banking model, bank feed, payment execution or reconciliation workflow is implemented.

Future bank accounts and credit cards belong to a company and map to approved GL accounts. Imported bank transactions need stable provider/source identity, exact amounts, effective/posting dates, immutable raw evidence references and deduplication. Bank rules propose categorization; posting requires approved policy and human authorization. Transfers must link both accounting sides and never create income merely from moving cash.

Reconciliation must separate imported, matched, cleared and reconciled states. A reconciliation records statement dates, beginning/ending balances, selected transactions, unresolved differences and approving actor. Closing must lock the reconciliation without silently rewriting journals. Corrections use controlled adjustments/reversals.

Introduce read-only import and matching before any execution provider. Actual bank balances, available cash and reconciled ledger balances are distinct measures with timestamps; future CFO projections must label each precisely.

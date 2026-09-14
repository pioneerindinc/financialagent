# Data ownership

| Data                                                         | Authoritative owner     |
| ------------------------------------------------------------ | ----------------------- |
| Pioneer customer/vendor operational identity                 | Pioneer ERP             |
| Pioneer source customer invoice                              | Pioneer ERP             |
| Pioneer source vendor bill evidence                          | Pioneer ERP             |
| Pioneer PO, receiving, repairs, inventory movement, shipping | Pioneer ERP             |
| 317 customer/vendor operational identity and source invoice  | 317 ERP                 |
| HQ customer/vendor operational identity and source invoice   | HQ ERP                  |
| Fish Properties financial transactions                       | FinancialAgent          |
| Company accounting identity and chart of accounts            | FinancialAgent          |
| Accounting periods, treatment, journal entries               | FinancialAgent          |
| Bank accounts, bank transactions, reconciliation             | FinancialAgent (future) |
| Customer payments and AR settlement                          | FinancialAgent (future) |
| Vendor payments and AP settlement                            | FinancialAgent (future) |
| Financial payment schedules and execution status             | FinancialAgent (future) |
| Payroll/tax liabilities, loans                               | FinancialAgent (future) |
| Financial statements                                         | FinancialAgent          |
| Manager findings, recommendations and analyses               | Pioneer Managers        |
| Manual business obligations                                  | Pioneer Managers        |

Operational facts may be projected with source IDs and necessary financial evidence; projections must not become competing operational master records. Manual business obligations remain in Managers; once an obligation has an accounting liability/payment record, FinancialAgent owns that financial status. The CFO Manager belongs in Pioneer Managers.

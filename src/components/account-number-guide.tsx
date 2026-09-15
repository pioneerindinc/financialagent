"use client";
import { useId, useState } from "react";
import styles from "./account-number-guide.module.css";

const ranges = [
  ["1000–1999", "Assets", "Cash, AR, inventory, fixed assets"],
  ["2000–2999", "Liabilities", "AP, credit cards, loans, payroll taxes"],
  ["3000–3999", "Equity", "Capital, distributions, retained earnings"],
  ["4000–4999", "Revenue", "Sales, service revenue, other operating revenue"],
  ["5000–5999", "Cost of Goods Sold", "Parts, materials, direct labor"],
  ["6000–6999", "Operating Expenses", "Payroll, rent, utilities, insurance"],
  ["7000–7999", "Other Income", "Interest income, gains"],
  ["8000–8999", "Other Expenses", "Interest expense, losses, unusual expenses"],
];

export function AccountCreateHeading({ companyName }: { companyName: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div
      className={styles.heading}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.stopPropagation();
        }
      }}
    >
      <h2>Create account · {companyName}</h2>
      <button
        type="button"
        className={styles.info}
        aria-label="Account number guide"
        aria-expanded={open}
        aria-controls={id}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      >
        i
      </button>
      {open && (
        <div
          id={id}
          className={styles.panel}
          role="region"
          aria-label="Account numbering reference"
        >
          <div className={styles.title}>
            <strong>Account number guide</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close account number guide"
            >
              ×
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">Range</th>
                <th scope="col">Category</th>
                <th scope="col">Examples</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map(([range, category, examples]) => (
                <tr key={range}>
                  <th scope="row">{range}</th>
                  <td>{category}</td>
                  <td>{examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            For account Type, use Expense for COGS, Operating Expenses, and
            Other Expenses; use Revenue for Other Income.
          </p>
        </div>
      )}
    </div>
  );
}

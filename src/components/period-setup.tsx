"use client";
import { useState } from "react";
import {
  PIONEER_2027_PERIODS,
  FINANCE_PLANNED_START,
  QUICKBOOKS_OFFICIAL_THROUGH,
} from "../lib/accounting-cutover";
import { formatDate } from "../lib/dates";

export function PioneerPeriodSetup({
  periods,
  canWrite,
  busy,
  setup,
}: {
  periods: { startDate: string; endDate: string; status: string }[];
  canWrite: boolean;
  busy: boolean;
  setup: (reason: string) => Promise<boolean>;
}) {
  const [done, setDone] = useState(false);
  const conflict = periods.some(
    (period) =>
      period.startDate <= "2027-12-31" &&
      period.endDate >= "2027-01-01" &&
      !PIONEER_2027_PERIODS.some(
        (month) =>
          month.startDate === period.startDate &&
          month.endDate === period.endDate,
      ),
  );
  return (
    <section>
      <h2>Pioneer Industries · 2027 accounting setup</h2>
      <p>
        QuickBooks remains official through{" "}
        {formatDate(QUICKBOOKS_OFFICIAL_THROUGH)}. FinancialAgent’s planned
        accounting start is {formatDate(FINANCE_PLANNED_START)}.
      </p>
      <p>
        Setup creates missing months as open periods. Existing periods keep
        their dates and status. Creating periods does not activate the
        accounting cutover or post opening balances.
      </p>
      <details>
        <summary>Review the 12 monthly periods</summary>
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Setup action</th>
            </tr>
          </thead>
          <tbody>
            {PIONEER_2027_PERIODS.map((month) => {
              const existing = periods.find(
                (period) =>
                  period.startDate === month.startDate &&
                  period.endDate === month.endDate,
              );
              return (
                <tr key={month.startDate}>
                  <td>{formatDate(month.startDate)}</td>
                  <td>{formatDate(month.endDate)}</td>
                  <td>
                    {existing
                      ? `Keep existing · ${existing.status}`
                      : "Create open period"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
      {conflict && (
        <p role="alert">
          An existing period overlaps the monthly calendar. Resolve the conflict
          before setup; nothing will be overwritten.
        </p>
      )}
      {canWrite && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const reason = String(
              new FormData(event.currentTarget).get("reason"),
            );
            if (
              window.confirm(
                "Create missing 2027 monthly periods for Pioneer Industries as OPEN? Existing periods will remain unchanged. This does not activate the accounting cutover.",
              )
            ) {
              setDone(false);
              setDone(await setup(reason));
            }
          }}
        >
          <label>
            Setup reason
            <input name="reason" required maxLength={500} />
          </label>
          <button disabled={busy || conflict}>
            Create missing 2027 periods
          </button>
        </form>
      )}
      {done && (
        <p role="status">
          2027 monthly setup complete. Existing periods were preserved.
        </p>
      )}
    </section>
  );
}

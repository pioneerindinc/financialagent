"use client";
import { useState } from "react";
import type { InvoicePreview } from "../domains/ar/preview";
import { DateInput } from "./date-input";
import { formatDate } from "../lib/dates";
import { formatMoney } from "../lib/money";

export function ArPreview({ company }: { company: string }) {
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <section aria-labelledby="erp-preview-title">
      <h2 id="erp-preview-title">Live ERP invoice preview</h2>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPreview(null);
          setError("");
          setBusy(true);
          try {
            const query = new URLSearchParams({
              company,
              from: String(form.get("from")),
              to: String(form.get("to")),
              limit: String(form.get("limit")),
            });
            const response = await fetch(`/api/ar/preview?${query}`, {
              cache: "no-store",
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(
                result.error || "Unable to retrieve ERP preview.",
              );
            setPreview(result);
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Unable to retrieve ERP preview.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >

  <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Preview from</th>
                  <th>Preview through</th>
                  <th>Maximum invoices</th>
                  </tr>
                  </thead>
                  <tbody>
                
                  <tr>
                    <td><DateInput name="from" defaultValue="2026-10-01" required /></td>
                    <td><DateInput name="to" defaultValue="2026-10-12" required /></td>
                    <td><input name="limit" type="number" min={1} max={100} defaultValue={50} required disabled={busy}/></td>
                    </tr>
                    </tbody>
                  </table>
                </div>

        <fieldset disabled={busy}>
          <button type="submit">Preview ERP invoices</button>
        </fieldset>
      </form>
      {busy && (
        <p role="status">Retrieving and validating the complete ERP window…</p>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <div>
          {!preview.invoiceCount && (
            <p>No ERP invoices returned for this window.</p>
          )}
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Invoice number</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Invoice date</th>
                  <th scope="col">Source total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {preview.invoices.map((invoice) => (
                  <tr key={invoice.sourceId}>
                    <td>{invoice.invoiceNumber || "Unnumbered invoice"}</td>
                    <td>{invoice.customer || "Unknown customer"}</td>
                    <td>
                      {invoice.invoiceDate
                        ? formatDate(invoice.invoiceDate)
                        : "Unknown date"}
                    </td>
                    <td>
                      {invoice.totalAmountCents === null
                        ? "Unknown"
                        : formatMoney(invoice.totalAmountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

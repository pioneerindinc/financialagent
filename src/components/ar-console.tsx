"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DateInput } from "./date-input";
import { ArPreview } from "./ar-preview";
import { formatDate } from "../lib/dates";
import { formatMoney } from "../lib/money";
type Account = {
  _id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  postingAccount?: boolean;
  controlAccount?: boolean;
};
type Version = {
  _id: string;
  sourceRevision: string;
  mode: string;
  status: string;
  originalAmountCents: number | null;
  journalId?: string;
  importedAt: string;
  payload: {
    invoiceNumber: string | null;
    customer: { customerId: string | null; displayName: string | null };
    invoiceDate: string | null;
    dueDate: string | null;
    dueDateSource: string;
    dataQuality: string[];
    paymentTermsSnapshot: unknown;
    lines: {
      sourceLineId: string;
      description: string | null;
      mappingKey: string;
      itemReference: string | null;
      partId: string | null;
      amountCents: number | null;
      dataQuality: string[];
    }[];
  };
};
type Data = {
  authoritativeEnabled: boolean;
  nextCursor: string | null;
  mapping: { version: number; arAccountId: string; rules: unknown[] } | null;
  rows: {
    invoiceId: string;
    current: Version;
    reviewIssues: string[];
    lineMappings: { sourceLineId: string; accountId: string | null }[];
    recognizedReceivableCents: number;
    remainingBalanceCents: null;
    paymentStatus: string;
    postedJournalIds: string[];
    reversalJournalIds: string[];
    versions?: Version[];
    versionCount?: number;
  }[];
};
export function ArConsole({
  company,
  canWrite,
  accounts,
}: {
  company: string;
  canWrite: boolean;
  accounts: Account[];
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [cursor, setCursor] = useState(""),
    [invoice, setInvoice] = useState("");
  const [from, setFrom] = useState("2026-01-01"),
    [to, setTo] = useState("2026-12-31"),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/api/ar?${new URLSearchParams({ company, ...(cursor ? { cursor } : {}), ...(invoice ? { invoice } : {}) })}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok) throw new Error(value.error);
        setData(value);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setData(null);
        }
      });
    return () => controller.abort();
  }, [company, cursor, invoice, refresh]);
  async function command(payload: object) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/ar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company, ...payload }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setNotice(
        result.complete
          ? `Complete scan imported: ${result.imported} new revisions; ${result.replayed} unchanged.`
          : "Saved. Accounting drafts still require human review and posting.",
      );
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AR request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ArPreview key={company} company={company} />
      {data && (
        <>
          {canWrite && (
            <section>
              <h2>Import complete ERP window</h2>
              <p>
                Read-only ERP scan, maximum 250 invoices / 5,000 lines per
                import. Absence never means cancellation. Rescan prior windows
                for corrections.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (
                    confirm(
                      "Read this ERP window and import its complete source revisions into this company's AR projection? No journals will post.",
                    )
                  )
                    void command({
                      action: "sync",
                      query: { from, to, limit: Number(f.get("limit")) },
                      mode: f.get("mode"),
                      reason: f.get("reason"),
                    });
                }}
              >
                <label>
                  From
                  <DateInput
                    defaultValue={from}
                    onDateChange={setFrom}
                    required
                  />
                </label>
                <label>
                  Through
                  <DateInput defaultValue={to} onDateChange={setTo} required />
                </label>
                <label>
                  Ingestion mode
                  <select name="mode" defaultValue="parallel">
                    <option value="parallel">
                      Parallel / non-authoritative — projection only
                    </option>
                    <option
                      value="authoritative"
                      disabled={!data.authoritativeEnabled}
                    >
                      Authoritative — 2027+ reviewed drafts
                    </option>
                  </select>
                </label>
                <label>
                  Page size
                  <input
                    name="limit"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={50}
                    required
                  />
                </label>
                <label>
                  Import reason
                  <input name="reason" required maxLength={500} />
                </label>
                <button disabled={busy}>Import ERP window</button>
              </form>
            </section>
          )}
          {canWrite && (
            <section>
              <details>
                <summary>
                  Review company AR and revenue mappings · version{" "}
                  {data.mapping?.version || 0}
                </summary>
                <p>
                  Choose an Asset control account. Rules require mappingKey,
                  accountId and a review reason; optional sourceType, exact
                  itemReference or partId. Part-sale-item, standalone-item and
                  unmapped require an item-specific rule. Never classify tax as
                  revenue or guess from descriptions. Saving a mapping
                  invalidates older unposted draft mappings until rebuilt.
                </p>
                <p>
                  Available posting Revenue accounts:{" "}
                  {accounts
                    .filter(
                      (a) =>
                        a.type === "Revenue" &&
                        a.active &&
                        a.postingAccount !== false,
                    )
                    .map((a) => `${a.code} ${a.name}: ${a._id}`)
                    .join("; ") || "None"}
                </p>
                <form
                  key={data.mapping?.version || 0}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    try {
                      const rules = JSON.parse(String(f.get("rules")));
                      void command({
                        action: "mapping",
                        version: data.mapping?.version || 0,
                        data: { arAccountId: f.get("arAccountId"), rules },
                        reason: f.get("reason"),
                      });
                    } catch {
                      setError("Revenue rules must be valid JSON");
                    }
                  }}
                >
                  <label>
                    AR control account
                    <select
                      name="arAccountId"
                      defaultValue={data.mapping?.arAccountId || ""}
                      required
                    >
                      <option value="">Select account</option>
                      {accounts
                        .filter(
                          (a) =>
                            a.type === "Asset" &&
                            a.active &&
                            a.postingAccount !== false &&
                            a.controlAccount,
                        )
                        .map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Reviewed revenue rules (JSON)
                    <textarea
                      name="rules"
                      rows={8}
                      defaultValue={JSON.stringify(
                        data.mapping?.rules || [],
                        null,
                        2,
                      )}
                      required
                    />
                  </label>
                  <label>
                    Mapping approval reason
                    <input name="reason" required maxLength={500} />
                  </label>
                  <button disabled={busy}>Save reviewed mapping</button>
                </form>
              </details>
            </section>
          )}
          <section>
            <h2>Source invoices and recognized AR</h2>
            <button
              onClick={() => {
                setCursor("");
                setInvoice("");
              }}
              disabled={busy}
            >
              First page / all invoices
            </button>
            {!data.rows.length && <p>No imported invoices in this view.</p>}
            {data.rows.map((row) => (
              <article key={row.invoiceId}>
                <h3>
                  {row.current.payload.invoiceNumber || "Unnumbered invoice"} ·{" "}
                  {row.current.payload.customer.displayName ||
                    "Unknown customer"}
                </h3>
                <p>
                  {row.current.mode} · {row.current.status} · Invoice{" "}
                  {row.current.payload.invoiceDate
                    ? formatDate(row.current.payload.invoiceDate)
                    : "Unknown date"}{" "}
                  · Due{" "}
                  {row.current.payload.dueDate
                    ? formatDate(row.current.payload.dueDate)
                    : "Unknown"}{" "}
                  ({row.current.payload.dueDateSource})
                </p>
                <p>
                  Revision source amount:{" "}
                  {row.current.originalAmountCents === null
                    ? "Unknown"
                    : formatMoney(row.current.originalAmountCents)}{" "}
                  · Recognized invoice AR:{" "}
                  {formatMoney(row.recognizedReceivableCents)} ·
                  Remaining/payment status: not tracked
                </p>
                <p>
                  {row.reviewIssues.join("; ") ||
                    "Source and mapping checks passed; human accounting review remains required."}
                </p>
                <p>
                  Revenue mapping:{" "}
                  {row.lineMappings.length > 0 &&
                  row.lineMappings.every((line) => line.accountId)
                    ? "all lines resolved"
                    : "needs mapping review"}
                  . Mapping resolution does not authorize accounting posting.
                </p>
                <ul>
                  {row.lineMappings.map((line) => {
                    const account = accounts.find(
                      (a) => a._id === line.accountId,
                    );
                    return (
                      <li key={line.sourceLineId}>
                        {line.sourceLineId}: {account
                          ? `${account.code} · ${account.name}`
                          : line.accountId
                            ? "Mapped account unavailable"
                            : "Unresolved revenue target"}
                      </li>
                    );
                  })}
                </ul>
                <details>
                  <summary>Source lines and review evidence</summary>
                  <p>Source revision: {row.current.sourceRevision}</p>
                  <p>
                    Quality:{" "}
                    {row.current.payload.dataQuality.join(", ") || "No flags"}
                  </p>
                  <p>
                    Stored terms:{" "}
                    {row.current.payload.paymentTermsSnapshot
                      ? JSON.stringify(row.current.payload.paymentTermsSnapshot)
                      : "Unknown; no default terms applied"}
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Line</th>
                        <th>Description / item</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Review flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.current.payload.lines.map((line) => (
                        <tr key={line.sourceLineId}>
                          <td>{line.sourceLineId}</td>
                          <td>
                            {line.description} · {line.itemReference} ·{" "}
                            {line.partId}
                          </td>
                          <td>{line.mappingKey}</td>
                          <td>
                            {line.amountCents === null
                              ? "Unknown"
                              : formatMoney(line.amountCents)}
                          </td>
                          <td>{line.dataQuality.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
                {row.current.journalId && (
                  <p>
                    <Link
                      href={`/journal/${row.current.journalId}?company=${company}`}
                    >
                      Review accounting journal
                    </Link>
                  </p>
                )}
                {row.postedJournalIds.map((journal) => (
                  <p key={journal}>
                    <Link href={`/journal/${journal}?company=${company}`}>
                      Posted original / human reversal review
                    </Link>
                  </p>
                ))}
                {row.reversalJournalIds.map((journal) => (
                  <p key={journal}>
                    <Link href={`/journal/${journal}?company=${company}`}>
                      Posted reversal
                    </Link>
                  </p>
                ))}
                <button onClick={() => setInvoice(row.invoiceId)}>
                  View revision history
                </button>
                {row.versions && (
                  <p>
                    Latest {row.versions.length} of {row.versionCount}{" "}
                    revisions:{" "}
                    {row.versions
                      .map(
                        (v) => `${v.sourceRevision} (${v.mode}, ${v.status})`,
                      )
                      .join("; ")}
                  </p>
                )}
                {canWrite && row.current.mode === "authoritative" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void command({
                        action: "draft",
                        versionId: row.current._id,
                        reason: f.get("reason"),
                      });
                    }}
                  >
                    <label>
                      Draft review reason
                      <input name="reason" required maxLength={500} />
                    </label>
                    <button disabled={busy || row.reviewIssues.length > 0}>
                      Create / rebuild reviewed draft
                    </button>
                  </form>
                )}
              </article>
            ))}
            {data.nextCursor && (
              <button onClick={() => setCursor(data.nextCursor!)}>
                Next invoice page
              </button>
            )}
          </section>
        </>
      )}
    </>
  );
}

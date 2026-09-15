"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { formatMoney, dollarsToCents, centsToDollarInput } from "../lib/money";
import { AccountEditor, AccountGovernance } from "./account-governance";
import { DateInput } from "./date-input";
import { formatDate } from "../lib/dates";
import { AccountCreateHeading } from "./account-number-guide";
import accountGuideStyles from "./account-number-guide.module.css";
type Account = {
  _id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  active: boolean;
  parentId?: string;
  controlAccount?: boolean;
  allowManualPosting?: boolean;
  revision?: number;
};
type Entry = {
  _id: string;
  transactionDate: string;
  description: string;
  status: string;
  revision: number;
  reversalOf?: string;
  reversedBy?: string;
  sourceSystem: string;
  postingOrigin?: string;
  sourceType: string;
  sourceId: string;
  sourceRevision: string;
  lines: {
    accountId: string;
    debitCents: number;
    creditCents: number;
    memo: string;
  }[];
  createdBy: string;
  postedBy?: string;
};
type Overview = {
  company: { name: string };
  accounts: Account[];
  periods: {
    _id: string;
    startDate: string;
    endDate: string;
    status: string;
  }[];
  journals: Entry[];
  postedCount: number;
  draftCount: number;
};
type Report = {
  rows: {
    accountId: string;
    code?: string;
    name?: string;
    transactionDate?: string;
    journalId?: string;
    description?: string;
    debitCents: number;
    creditCents: number;
    runningBalanceCents?: number;
    sourceSystem?: string;
    sourceId?: string;
  }[];
  debitCents?: number;
  creditCents?: number;
};
const today = () => new Date().toISOString().slice(0, 10);
const links = [
  ["/", "Overview"],
  ["/companies", "Companies"],
  ["/accounts", "Chart of Accounts"],
  ["/periods", "Accounting periods"],
  ["/journal", "Journal entries"],
  ["/reports/trial-balance", "Trial Balance"],
  ["/reports/general-ledger", "General Ledger"],
];
export function FinanceConsole({
  view,
  journalId,
  companyIds,
  canWrite,
  showSignOut = false,
}: {
  view: string;
  journalId?: string;
  companyIds: string[];
  canWrite: boolean;
  showSignOut?: boolean;
}) {
  const search = useSearchParams();
  const requestedCompany = search.get("company") || "";
  const [selectedCompany, setCompany] = useState<string>();
  const [editingAccount, setEditingAccount] = useState<Account>();
  const [accountFormVersion, setAccountFormVersion] = useState(0);
  const company =
    selectedCompany ??
    (companyIds.includes(requestedCompany) ? requestedCompany : "");
  const [data, setData] = useState<Overview>();
  const [entry, setEntry] = useState<Entry>();
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [from, setFrom] = useState(`${today().slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today());
  const [filter, setFilter] = useState("");
  useEffect(() => {
    if (!company) return;
    if (["trial-balance", "general-ledger"].includes(view) && (!from || !to))
      return;
    const controller = new AbortController();
    async function get(query: string) {
      const response = await fetch(
        `/api/finance?company=${encodeURIComponent(company)}${query}`,
        { signal: controller.signal },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      return body;
    }
    Promise.all([
      get(""),
      view === "detail"
        ? get(`&view=journal&id=${encodeURIComponent(journalId || "")}`)
        : Promise.resolve(undefined),
      ["trial-balance", "general-ledger"].includes(view)
        ? get(
            `&view=${view}&asOf=${to}&from=${from}&to=${to}&account=${encodeURIComponent(filter)}`,
          )
        : Promise.resolve(undefined),
    ])
      .then(([overview, detail, result]) => {
        if (controller.signal.aborted) return;
        setError("");
        setData(overview);
        setEntry(detail);
        setReport(result);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [company, view, journalId, version, from, to, filter]);
  async function command(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company, action, ...payload }),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.issues
            ? `${result.error}: ${result.issues.map((i: { message: string }) => i.message).join(", ")}`
            : result.error,
        );
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function choose(value: string) {
    setEditingAccount(undefined);
    setData(undefined);
    setEntry(undefined);
    setReport(undefined);
    setFilter("");
    setError("");
    setCompany(value);
    const url = new URL(window.location.href);
    url.searchParams.set("company", value);
    window.history.replaceState(null, "", url);
  }
  const companyQuery = company ? `?company=${encodeURIComponent(company)}` : "";
  const title =
    view === "detail"
      ? "Journal detail"
      : links.find(
          ([path]) =>
            path ===
            (view === "dashboard"
              ? "/"
              : ["trial-balance", "general-ledger"].includes(view)
                ? `/reports/${view}`
                : `/${view}`),
        )?.[1];
  function journals() {
    return (
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Status</th>
            <th>Entry</th>
          </tr>
        </thead>
        <tbody>
          {data?.journals.map((j) => (
            <tr key={j._id}>
              <td>{formatDate(j.transactionDate)}</td>
              <td>{j.description}</td>
              <td>
                <span className="badge">{j.status}</span>
              </td>
              <td>
                <Link href={`/journal/${j._id}${companyQuery}`}>
                  Review entry →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="workspace">
      <aside>
        <div className="brand">
          FA <span>FinancialAgent</span>
        </div>
        <p className="eyebrow">ACCOUNTING WORKSPACE</p>
        <nav>
          {links.map(([href, label]) => (
            <Link key={href} href={`${href}${companyQuery}`}>
              {label}
            </Link>
          ))}
        </nav>
        <small>USD · Company books kept separate</small>
        {showSignOut && (
          <form
            action="/auth/sign-out"
            method="post"
            className="sidebar-sign-out"
          >
            <button type="submit">Sign out</button>
          </form>
        )}
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">COMPANY CONTEXT</p>
            <strong>
              {data?.company.name || "Select a company to continue"}
            </strong>
          </div>
          <label>
            Active company
            <select
              aria-label="Active company"
              value={company}
              disabled={busy}
              onChange={(e) => choose(e.target.value)}
            >
              <option value="">Choose company</option>
              {companyIds.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </header>
        <h1>{title}</h1>
        <p className="subtitle">
          {data?.company.name || "An explicit company selection is required."}
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {company && !data && !error && <p>Loading company records…</p>}
        {data && (
          <>
            {view === "companies" && (
              <section>
                <h2>{data.company.name}</h2>
                <p>
                  All accounts, journals, periods, and reports on this page
                  belong to this company. Use the selector above to change
                  books.
                </p>
              </section>
            )}
            {view === "dashboard" && (
              <>
                <div className="metrics">
                  <section>
                    <small>Accounts</small>
                    <h2>{data.accounts.length}</h2>
                  </section>
                  <section>
                    <small>Posted journals</small>
                    <h2>{data.postedCount}</h2>
                  </section>
                  <section>
                    <small>Draft journals</small>
                    <h2>{data.draftCount}</h2>
                  </section>
                </div>
                <section>
                  <h2>Open accounting periods</h2>
                  {data.periods
                    .filter((p) => p.status === "open")
                    .map((p) => (
                      <p key={p._id}>
                        {formatDate(p.startDate)} — {formatDate(p.endDate)}
                      </p>
                    ))}
                  {!data.periods.some((p) => p.status === "open") && (
                    <p>No open periods. Create a period before posting.</p>
                  )}
                </section>
                <section>
                  <h2>Recent journal activity</h2>
                  {journals()}
                </section>
              </>
            )}
            {view === "accounts" && (
              <>
                <section>
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Account</th>
                        <th>Type</th>
                        <th>Subtype</th>
                        <th>Status</th>
                        <th>Posting policy</th>
                        {canWrite && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.accounts.map((a) => (
                        <tr key={a._id}>
                          <td>{a.code}</td>
                          <td>{a.name}</td>
                          <td>{a.type}</td>
                          <td>{a.subtype}</td>
                          <td>{a.active ? "Active" : "Inactive"}</td>
                          <td>
                            {a.controlAccount === true ? "Control · " : ""}
                            {a.allowManualPosting === false
                              ? "No manual posting"
                              : "Manual posting allowed"}
                          </td>
                          {canWrite && (
                            <td>
                              <button
                                disabled={busy}
                                onClick={() => setEditingAccount(a)}
                              >
                                Edit {a.code}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                {canWrite && (
                  <section className={accountGuideStyles.container}>
                    <AccountCreateHeading companyName={data.company.name} />
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const f = new FormData(form);
                        if (
                          await command("account.create", {
                            data: {
                              code: f.get("code"),
                              name: f.get("name"),
                              type: f.get("type"),
                              subtype: f.get("subtype"),
                              controlAccount: f.has("controlAccount"),
                              allowManualPosting: f.has("allowManualPosting"),
                            },
                          })
                        ) {
                          form.reset();
                          setAccountFormVersion((v) => v + 1);
                        }
                      }}
                    >
                      <label>
                        Code
                        <input name="code" required />
                      </label>
                      <label>
                        Name
                        <input name="name" required />
                      </label>
                      <label>
                        Type
                        <select name="type" aria-label="Type">
                          {[
                            "Asset",
                            "Liability",
                            "Equity",
                            "Revenue",
                            "Expense",
                          ].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Subtype
                        <input name="subtype" />
                      </label>
                      <AccountGovernance
                        key={`${company}:${accountFormVersion}`}
                      />
                      <button disabled={busy}>Create account</button>
                    </form>
                  </section>
                )}
                {canWrite && editingAccount && (
                  <AccountEditor
                    key={`${company}:${editingAccount._id}:${editingAccount.revision ?? 0}`}
                    account={editingAccount}
                    accounts={data.accounts}
                    companyName={data.company.name}
                    busy={busy}
                    cancel={() => setEditingAccount(undefined)}
                    save={async (changes, reason) => {
                      if (
                        await command("account.edit", {
                          id: editingAccount._id,
                          revision: editingAccount.revision ?? 0,
                          data: changes,
                          reason,
                        })
                      )
                        setEditingAccount(undefined);
                    }}
                  />
                )}
              </>
            )}
            {view === "periods" && (
              <>
                <section>
                  {data.periods.map((p) => (
                    <div className="period" key={p._id}>
                      <span>
                        {formatDate(p.startDate)} — {formatDate(p.endDate)} ·{" "}
                        {p.status}
                      </span>
                      {canWrite && p.status === "open" && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            if (
                              window.confirm(
                                `Close this period for ${data.company.name}? Further posting to these dates will be blocked.`,
                              )
                            )
                              void command("period.close", {
                                id: p._id,
                                reason: f.get("reason"),
                              });
                          }}
                        >
                          <input
                            name="reason"
                            aria-label="Closure reason"
                            placeholder="Closure reason"
                            required
                          />
                          <button disabled={busy}>Close period</button>
                        </form>
                      )}
                    </div>
                  ))}
                </section>
                {canWrite && (
                  <section>
                    <h2>Open a period · {data.company.name}</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void command("period.create", {
                          data: {
                            startDate: f.get("start"),
                            endDate: f.get("end"),
                          },
                        });
                      }}
                    >
                      <label>
                        Start
                        <DateInput name="start" required />
                      </label>
                      <label>
                        End
                        <DateInput name="end" required />
                      </label>
                      <button disabled={busy}>Create period</button>
                    </form>
                  </section>
                )}
              </>
            )}
            {view === "journal" && (
              <>
                <section>
                  {journals()}
                  <small>
                    Most recent 100 entries. Reports include all posted history.
                  </small>
                </section>
                {canWrite && (
                  <JournalForm
                    key={company}
                    accounts={data.accounts}
                    companyName={data.company.name}
                    busy={busy}
                    submit={(value) =>
                      command("journal.create", { data: value })
                    }
                  />
                )}
              </>
            )}
            {view === "detail" && entry && (
              <>
                <section>
                  <h2>{entry.description}</h2>
                  <p>
                    {entry._id} · {entry.status} ·{" "}
                    {formatDate(entry.transactionDate)}
                  </p>
                  <p>
                    Source: {entry.sourceSystem} / {entry.sourceType} /{" "}
                    {entry.sourceId} / {entry.sourceRevision}
                  </p>
                  <p>
                    Created by {entry.createdBy}
                    {entry.postedBy && ` · Posted by ${entry.postedBy}`}
                  </p>
                  {entry.reversalOf && (
                    <p>
                      Reversal of{" "}
                      <Link
                        href={`/journal/${entry.reversalOf}${companyQuery}`}
                      >
                        {entry.reversalOf}
                      </Link>
                    </p>
                  )}
                  {entry.reversedBy && (
                    <p>
                      Reversed by{" "}
                      <Link
                        href={`/journal/${entry.reversedBy}${companyQuery}`}
                      >
                        {entry.reversedBy}
                      </Link>
                    </p>
                  )}
                  <table>
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Memo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.lines.map((l, i) => (
                        <tr key={i}>
                          <td>
                            {data.accounts.find((a) => a._id === l.accountId)
                              ?.name || l.accountId}
                          </td>
                          <td>{formatMoney(l.debitCents)}</td>
                          <td>{formatMoney(l.creditCents)}</td>
                          <td>{l.memo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {canWrite && entry.status === "draft" && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Post this reviewed journal to ${data.company.name}? Posted lines cannot be edited.`,
                          )
                        )
                          void command("journal.post", {
                            id: entry._id,
                            revision: entry.revision,
                          });
                      }}
                    >
                      Post reviewed journal
                    </button>
                  )}
                  {canWrite &&
                    entry.status === "posted" &&
                    !entry.reversedBy &&
                    !entry.reversalOf && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          if (
                            window.confirm(
                              `Post equal and opposite lines to ${data.company.name}?`,
                            )
                          )
                            void command("journal.reverse", {
                              id: entry._id,
                              date: f.get("date"),
                              reason: f.get("reason"),
                            });
                        }}
                      >
                        <label>
                          Reversal date
                          <DateInput
                            name="date"
                            required
                            defaultValue={today()}
                          />
                        </label>
                        <label>
                          Reason
                          <input name="reason" required />
                        </label>
                        <button disabled={busy}>Reverse journal</button>
                      </form>
                    )}
                </section>
                {canWrite &&
                  entry.status === "draft" &&
                  entry.sourceSystem === "manual" &&
                  entry.postingOrigin !== "source" &&
                  !(
                    entry.postingOrigin === undefined &&
                    entry.createdBy.startsWith("service:")
                  ) && (
                    <JournalForm
                      key={`${entry._id}-${entry.revision}`}
                      accounts={data.accounts}
                      companyName={data.company.name}
                      busy={busy}
                      entry={entry}
                      submit={(value) =>
                        command("journal.edit", {
                          id: entry._id,
                          revision: entry.revision,
                          data: value,
                        })
                      }
                    />
                  )}
              </>
            )}
            {["trial-balance", "general-ledger"].includes(view) && (
              <section>
                <div className="filters">
                  {view === "general-ledger" && (
                    <>
                      <label>
                        From
                        <DateInput
                          defaultValue={from}
                          required
                          onDateChange={(iso) => {
                            setReport(undefined);
                            setFrom(iso);
                          }}
                        />
                      </label>
                      <label>
                        Account
                        <select
                          aria-label="Account"
                          value={filter}
                          onChange={(e) => {
                            setReport(undefined);
                            setFilter(e.target.value);
                          }}
                        >
                          <option value="">All accounts</option>
                          {data.accounts.map((a) => (
                            <option key={a._id} value={a._id}>
                              {a.code} · {a.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    {view === "trial-balance" ? "As of" : "Through"}
                    <DateInput
                      defaultValue={to}
                      required
                      onDateChange={(iso) => {
                        setReport(undefined);
                        setTo(iso);
                      }}
                    />
                  </label>
                </div>
                <p>Posted entries only · Transaction date basis · USD</p>
                {report && (
                  <table>
                    <thead>
                      <tr>
                        {view === "general-ledger" && (
                          <>
                            <th>Date / Entry</th>
                            <th>Description / Source</th>
                          </>
                        )}
                        <th>Account</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        {view === "general-ledger" && (
                          <th>Running debit balance</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r, i) => (
                        <tr key={i}>
                          {view === "general-ledger" && (
                            <>
                              <td>
                                {formatDate(r.transactionDate || "")}
                                <br />
                                <Link
                                  href={`/journal/${r.journalId}${companyQuery}`}
                                >
                                  View journal
                                </Link>
                              </td>
                              <td>
                                {r.description}
                                <br />
                                <small>
                                  {r.sourceSystem} / {r.sourceId}
                                </small>
                              </td>
                            </>
                          )}
                          <td>
                            {r.code ||
                              data.accounts.find((a) => a._id === r.accountId)
                                ?.code}{" "}
                            ·{" "}
                            {r.name ||
                              data.accounts.find((a) => a._id === r.accountId)
                                ?.name}
                          </td>
                          <td>{formatMoney(r.debitCents)}</td>
                          <td>{formatMoney(r.creditCents)}</td>
                          {view === "general-ledger" && (
                            <td>{formatMoney(r.runningBalanceCents || 0)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    {view === "trial-balance" && (
                      <tfoot>
                        <tr>
                          <th>Total</th>
                          <th>{formatMoney(report.debitCents || 0)}</th>
                          <th>{formatMoney(report.creditCents || 0)}</th>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
function JournalForm({
  accounts,
  companyName,
  busy,
  entry,
  submit,
}: {
  accounts: Account[];
  companyName: string;
  busy: boolean;
  entry?: Entry;
  submit: (data: unknown) => Promise<boolean>;
}) {
  const [lines, setLines] = useState(
    entry?.lines.map((line) => ({
      accountId: line.accountId,
      memo: line.memo,
      debit: centsToDollarInput(line.debitCents),
      credit: centsToDollarInput(line.creditCents),
    })) || [
      { accountId: "", debit: "", credit: "", memo: "" },
      { accountId: "", debit: "", credit: "", memo: "" },
    ],
  );
  const [amountError, setAmountError] = useState("");
  const [sourceId] = useState(() => entry?.sourceId || crypto.randomUUID());
  const [saved, setSaved] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let amounts;
    try {
      amounts = lines.map((line) => ({
        accountId: line.accountId,
        memo: line.memo,
        debitCents: dollarsToCents(line.debit),
        creditCents: dollarsToCents(line.credit),
      }));
      setAmountError("");
    } catch (error) {
      setAmountError(
        error instanceof Error ? error.message : "Invalid dollar amount",
      );
      return;
    }
    if (
      await submit({
        transactionDate: f.get("date"),
        description: f.get("description"),
        sourceSystem: entry?.sourceSystem || "manual",
        sourceType: entry?.sourceType || "journal",
        sourceId,
        sourceRevision: entry?.sourceRevision || "1",
        lines: amounts,
      })
    )
      setSaved(true);
  }
  if (saved && !entry)
    return (
      <section>
        <p>Draft saved. Open it from the journal list to review and post.</p>
        <button onClick={() => window.location.reload()}>
          Create another draft
        </button>
      </section>
    );
  return (
    <section>
      <h2>
        {entry ? "Edit draft" : "New draft"} · {companyName}
      </h2>
      <p>Debits and credits must balance.</p>
      {amountError && <p role="alert">{amountError}</p>}
      <form onSubmit={save}>
        <label>
          Transaction date
          <DateInput
            name="date"
            required
            defaultValue={entry?.transactionDate || today()}
          />
        </label>
        <label>
          Description
          <input
            name="description"
            required
            defaultValue={entry?.description}
          />
        </label>
        <div className="lines">
          {lines.map((line, index) => (
            <div className="line" key={index}>
              <label>
                Account
                <select
                  aria-label="Account"
                  required
                  value={line.accountId}
                  onChange={(e) =>
                    setLines(
                      lines.map((l, i) =>
                        i === index ? { ...l, accountId: e.target.value } : l,
                      ),
                    )
                  }
                >
                  <option value="">Select account</option>
                  {accounts
                    .filter(
                      (a) =>
                        a._id === line.accountId &&
                        (!a.active || a.allowManualPosting === false),
                    )
                    .map((a) => (
                      <option key={a._id} value={a._id} disabled>
                        {a.code} · {a.name} (unavailable for manual posting)
                      </option>
                    ))}
                  {accounts
                    .filter((a) => a.active && a.allowManualPosting !== false)
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                </select>
              </label>
              {(["debit", "credit"] as const).map((side) => (
                <label key={side}>
                  {side === "debit" ? "Debit ($)" : "Credit ($)"}
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    maxLength={32}
                    value={line[side]}
                    onChange={(e) =>
                      setLines(
                        lines.map((l, i) =>
                          i === index ? { ...l, [side]: e.target.value } : l,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <label>
                Memo
                <input
                  value={line.memo}
                  onChange={(e) =>
                    setLines(
                      lines.map((l, i) =>
                        i === index ? { ...l, memo: e.target.value } : l,
                      ),
                    )
                  }
                />
              </label>
              {lines.length > 2 && (
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setLines([
              ...lines,
              { accountId: "", debit: "", credit: "", memo: "" },
            ])
          }
        >
          Add line
        </button>
        <button disabled={busy}>Save balanced draft</button>
      </form>
    </section>
  );
}

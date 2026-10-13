"use client";
import { useState } from "react";
import Link from "next/link";
import type { AllocationManagementReport } from "../domains/repair-allocation/report";
import { formatMoney } from "../lib/money";

export function RepairAllocationReport({ company }: { company: string }) {
  const [report, setReport] = useState<AllocationManagementReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main>
    <p><Link href="/">← Finance workspace</Link></p>
    <p className="eyebrow">MANAGEMENT REPORT · READ ONLY</p>
    <h1>Pioneer Repair Revenue Allocation</h1>
    <p className="subtitle">Calculated parts and services are reporting evidence, not earned or posted revenue. Actual billed invoice values are counted once.</p>
    <section>
      <form onSubmit={async event => {
        event.preventDefault(); const values = new FormData(event.currentTarget);
        setBusy(true); setError(""); setReport(null);
        try {
          const params = new URLSearchParams({ view: "repair-allocation", company,
            from: String(values.get("from")), to: String(values.get("to")) });
          const response = await fetch(`/api/finance?${params}`, { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Complete report unavailable.");
          setReport(result);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Complete report unavailable."); }
        finally { setBusy(false); }
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "end" }}>
          <label>Finalized from (Indianapolis)<br/><input name="from" type="date" defaultValue="2027-01-01" required disabled={busy}/></label>
          <label>Through (Indianapolis)<br/><input name="to" type="date" defaultValue="2027-01-31" required disabled={busy}/></label>
          <button disabled={busy}>{busy ? "Retrieving complete report…" : "Run report"}</button>
        </div>
      </form>
      {busy && <p role="status">Validating the complete ERP evidence scan and invoice snapshot…</p>}
      {error && <p role="alert">Report unavailable: {error}</p>}
    </section>
    {report && <>
      <section aria-label="Report coverage">
        <h2>Coverage</h2>
        <p>Complete evidence scan · {report.invoiceCount} invoices · {report.unallocatedExceptionCount} billed Unallocated / Exceptions · {report.unboundExceptionCount} unbound ERP exceptions</p>
        <p>Eligible repair invoice-count coverage: {report.eligibleRepairClassifiedInvoiceCount} / {report.eligibleRepairInvoiceCount} classified with valid reconciled evidence ({report.coveragePercent}%). Billed exception coverage remains separate at {formatMoney(report.unallocatedExceptionsCents)}.</p>
        <p>Outside allocation policy: {report.outsidePolicyRepairCount} repair invoices. These remain in billed totals and are not missing-evidence exceptions.</p>
      </section>
      <section aria-label="Management totals">
        <h2>Reporting classifications</h2>
        <div className="metrics">
          <Metric label="Repair parts · 4210 (calculated)" cents={report.repairParts4210Cents}/>
          <Metric label="Repair labor & services · 4100 (calculated)" cents={report.repairServices4100Cents}/>
          <Metric label="Direct parts sales · 4200 (existing billed)" cents={report.directParts4200Cents}/>
          <Metric label="Contract pricing adjustments (signed)" cents={report.contractAdjustmentsCents}/>
          <Metric label="Concession deductions (signed reduction)" cents={-report.concessionDeductionsCents}/>
          <Metric label="Unallocated / Exceptions (billed repair value)" cents={report.unallocatedExceptionsCents}/>
          <Metric label="Outside allocation policy (billed repair value)" cents={report.outsidePolicyRepairCents}/>
          <Metric label="Other existing billed value (including shipping/non-repair)" cents={report.otherExistingBilledCents}/>
          <Metric label="Actual billed repair net (subtotal; included above)" cents={report.actualBilledRepairNetCents}/>
          <Metric label="Actual billed invoice total · counted once" cents={report.billedInvoiceCents}/>
        </div>
        <p>Reconciliation bridge difference: {formatMoney(report.bridgeDifferenceCents)}. Report totals are not GL postings and do not change AR.</p>
      </section>
      <section aria-label="Exceptions">
        <h2>Unallocated / Exceptions</h2>
        {report.exceptions.length === 0 && report.unboundExceptionRecordIds.length === 0
          ? <p>No bound or unbound allocation exceptions in this report window.</p>
          : <ul>{report.exceptions.map(item => <li key={item.sourceId}>{item.sourceId}: {formatMoney(item.billedRepairCents)} billed · {item.reasonCodes.join(", ")}</li>)}
            {report.unboundExceptionRecordIds.map(id => <li key={id}>Unbound ERP exception {id}: invoice linkage unavailable; any matching billed invoice remains in Unallocated / Exceptions by its own missing-evidence status.</li>)}</ul>}
      </section>
    </>}
  </main>;
}

function Metric({ label, cents }: { label: string; cents: number }) {
  return <div><small>{label}</small><strong style={{ display: "block", fontSize: 22 }}>{formatMoney(cents)}</strong></div>;
}

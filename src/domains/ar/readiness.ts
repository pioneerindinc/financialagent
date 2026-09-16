import type { RetainedInvoice as FinancialInvoice } from "./contract";
import { type Mapping, resolveLine } from "./mapping";

const informational = new Set([
  "legacy-source-identity",
  "current-source-amount-not-immutable-original",
  "positional-line-identity",
  "missing-due-date",
  "terms-snapshot-unavailable",
  "missing-customer-terms",
  "unsupported-customer-terms",
  "non-calendar-payment-terms",
]);
/** Validate numbers independently of quality flags; unknown flags fail closed. */
export function readiness(record: FinancialInvoice, mapping: Mapping | null) {
  const issues = new Set<string>();
  if (record.state !== "active" || !record.sourcePresent)
    issues.add("Source is not an active present invoice");
  if (!record.customer.customerId?.trim())
    issues.add("Missing customer identity");
  if (!record.invoiceNumber?.trim()) issues.add("Missing invoice number");
  if (
    !record.invoiceDate ||
    !record.issuedAt ||
    record.issuedAt.slice(0, 10) !== record.invoiceDate
  )
    issues.add("Missing or inconsistent invoice issue date");
  if ((record.dueDate === null) !== (record.dueDateSource === "missing"))
    issues.add("Inconsistent due date evidence");
  const flags = [
    ...record.dataQuality,
    ...(record.paymentTermsSnapshot?.qualityFlags || []),
  ];
  for (const flag of flags) {
    if (flag === "revenue-classification-review") {
      const reviewLines = record.lines.filter((line) =>
        ["unmapped", "part-sale-item", "standalone-item"].includes(
          line.mappingKey,
        ),
      );
      if (
        !reviewLines.length ||
        !mapping ||
        reviewLines.some((line) => !resolveLine(record, line, mapping))
      )
        issues.add(flag);
    } else if (!informational.has(flag)) issues.add(flag);
  }
  const t = record.totals;
  for (const value of [
    t.sourceAmountCents,
    t.subtotalCents,
    t.shippingCents,
    t.linesCents,
  ])
    if (value === null || !Number.isSafeInteger(value) || value < 0)
      issues.add("Unknown/invalid/negative invoice amount");
  if (t.taxCents !== null || t.discountCents !== null)
    issues.add("Unsupported tax/discount evidence");
  let itemSum = BigInt(0),
    allSum = BigInt(0),
    shippingSum = BigInt(0),
    shippingCount = 0;
  const ids = new Set<string>();
  for (const line of record.lines) {
    if (ids.has(line.sourceLineId))
      issues.add("Duplicate positional line identity");
    ids.add(line.sourceLineId);
    const account = mapping ? resolveLine(record, line, mapping) : null;
    if (!account)
      issues.add(`Unresolved or ambiguous mapping: ${line.sourceLineId}`);
    for (const flag of line.dataQuality)
      if (!(flag === "revenue-classification-review" && account))
        issues.add(`Line ${line.sourceLineId}: ${flag}`);
    if (
      line.amountCents === null ||
      !Number.isSafeInteger(line.amountCents) ||
      line.amountCents < 0
    )
      issues.add("Unknown/invalid/negative line amount");
    else {
      allSum += BigInt(line.amountCents);
      if (line.lineType === "item") itemSum += BigInt(line.amountCents);
      else shippingSum += BigInt(line.amountCents);
    }
    if (line.lineType === "shipping") {
      shippingCount++;
      if (line.mappingKey !== "shipping-income")
        issues.add("Invalid shipping classification");
    } else {
      if (line.mappingKey === "shipping-income")
        issues.add("Item shipping classification needs source review");
      if (
        record.sourceType !== "repair-invoice" &&
        (line.quantity === null || line.unitPriceCents === null)
      )
        issues.add("Missing item quantity/price");
      if (
        (line.quantity !== null && line.quantity < 0) ||
        (line.unitPriceCents !== null && line.unitPriceCents < 0)
      )
        issues.add("Negative quantity/price");
      if (
        line.quantity !== null &&
        line.unitPriceCents !== null &&
        line.amountCents !== null
      ) {
        // Decimal-string rational extension; no dollar conversion or residual rounding.
        const parts = line.quantity.toString().toLowerCase().split("e");
        const decimals = (parts[0].split(".")[1] || "").length;
        const exponent = Number(parts[1] || 0) - decimals;
        const numerator =
          BigInt(parts[0].replace(".", "")) * BigInt(line.unitPriceCents);
        if (
          exponent >= 0
            ? numerator * BigInt(10) ** BigInt(exponent) !==
              BigInt(line.amountCents)
            : numerator !==
              BigInt(line.amountCents) * BigInt(10) ** BigInt(-exponent)
        )
          issues.add("Line extension mismatch");
      }
    }
  }
  if (!record.lines.some((line) => line.lineType === "item"))
    issues.add("Missing financial item lines");
  if (
    shippingCount > 1 ||
    (t.shippingCents === 0 && shippingCount !== 0) ||
    (t.shippingCents !== null && shippingSum !== BigInt(t.shippingCents))
  )
    issues.add("Shipping evidence mismatch");
  if (t.subtotalCents !== null && itemSum !== BigInt(t.subtotalCents))
    issues.add("Subtotal mismatch");
  if (
    (t.sourceAmountCents !== null && allSum !== BigInt(t.sourceAmountCents)) ||
    (t.linesCents !== null && allSum !== BigInt(t.linesCents))
  )
    issues.add("Invoice total mismatch");
  if (allSum > BigInt(Number.MAX_SAFE_INTEGER))
    issues.add("Invoice total exceeds safe cents");
  if (!mapping) issues.add("No approved company mapping");
  return [...issues];
}

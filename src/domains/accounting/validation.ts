import { z } from "zod";
import { add } from "../../lib/money";
import { assert } from "../../lib/errors";
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const id = z.string().min(1).max(100);
export const text = z.string().trim().min(1).max(500);
export const lineSchema = z
  .object({
    accountId: id,
    debitCents: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    creditCents: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    memo: z.string().max(500).default(""),
  })
  .strict();
export const draftSchema = z
  .object({
    transactionDate: date,
    description: text,
    sourceSystem: id,
    sourceType: id,
    sourceId: id,
    sourceRevision: id,
    lines: z.array(lineSchema).min(2).max(500),
  })
  .strict();
export function validateJournal(input: unknown) {
  const data = draftSchema.parse(input);
  let debit = 0,
    credit = 0;
  for (const line of data.lines) {
    assert(
      line.debitCents > 0 !== line.creditCents > 0,
      "Each line must have exactly one positive side",
    );
    debit = add(debit, line.debitCents);
    credit = add(credit, line.creditCents);
  }
  assert(debit === credit, "Journal must balance");
  return data;
}
export const accountSchema = z
  .object({
    code: z.string().trim().min(1).max(30),
    name: text,
    type: z.enum(["Asset", "Liability", "Equity", "Revenue", "Expense"]),
    subtype: z.string().max(100).default(""),
    parentId: id.optional(),
    active: z.boolean().default(true),
    controlAccount: z.boolean().default(false),
    allowManualPosting: z.boolean().optional(),
  })
  .strict()
  .transform((data) => ({
    ...data,
    allowManualPosting: data.allowManualPosting ?? !data.controlAccount,
  }));
export const accountEditSchema = z
  .object({
    name: text.optional(),
    subtype: z.string().max(100).optional(),
    parentId: id.nullable().optional(),
    active: z.boolean().optional(),
    controlAccount: z.boolean().optional(),
    allowManualPosting: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one account change is required",
  );
export const periodSchema = z
  .object({ startDate: date, endDate: date })
  .strict()
  .refine((p) => p.startDate <= p.endDate, "Invalid period range");

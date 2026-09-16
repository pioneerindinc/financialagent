import { z } from "zod";
import type { ClientSession } from "mongoose";
import { Account } from "../../models";
import { assert } from "../../lib/errors";
import { id, text } from "../accounting/validation";
import type { RetainedInvoice as FinancialInvoice } from "./contract";

export const mappingSchema = z
  .object({
    arAccountId: id,
    rules: z
      .array(
        z
          .object({
            mappingKey: z.enum([
              "repair-revenue",
              "equipment-sales",
              "part-sale-item",
              "standalone-item",
              "shipping-income",
              "unmapped",
            ]),
            sourceType: z
              .enum([
                "part-sale-invoice",
                "repair-invoice",
                "standalone-invoice",
              ])
              .optional(),
            itemReference: z.string().trim().min(1).max(1000).optional(),
            partId: id.optional(),
            accountId: id,
            reason: text,
          })
          .strict()
          .refine(
            (rule) =>
              !["unmapped", "part-sale-item", "standalone-item"].includes(
                rule.mappingKey,
              ) || !!(rule.itemReference || rule.partId),
            "Ambiguous categories require reviewed exact itemReference or partId mappings",
          ),
      )
      .max(500),
  })
  .strict();
export type Mapping = z.infer<typeof mappingSchema>;
export async function validateMappingAccounts(
  companyId: string,
  mapping: Mapping,
  session: ClientSession,
) {
  const ar = await Account.findOne({
    _id: mapping.arAccountId,
    companyId,
    type: "Asset",
    active: true,
    controlAccount: true,
    postingAccount: { $ne: false },
  }).session(session);
  assert(
    ar,
    "AR must be an active company-owned posting Asset control account",
  );
  const ids = [...new Set(mapping.rules.map((rule) => rule.accountId))];
  assert(
    (await Account.countDocuments({
      companyId,
      _id: { $in: ids },
      type: "Revenue",
      active: true,
      postingAccount: { $ne: false },
    }).session(session)) === ids.length,
    "Revenue mappings require active company-owned posting Revenue accounts",
  );
}
export function resolveLine(
  record: FinancialInvoice,
  line: FinancialInvoice["lines"][number],
  mapping: Mapping,
) {
  const matches = mapping.rules.filter(
    (rule) =>
      rule.mappingKey === line.mappingKey &&
      (!rule.sourceType || rule.sourceType === record.sourceType) &&
      (!rule.itemReference || rule.itemReference === line.itemReference) &&
      (!rule.partId || rule.partId === line.partId),
  );
  // Explicit item matches take precedence over family defaults, never over another item match.
  const specific = matches.filter((rule) => rule.itemReference || rule.partId);
  const chosen = specific.length ? specific : matches;
  return chosen.length === 1 ? chosen[0].accountId : null;
}

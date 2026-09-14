import { Company, ensureIndexes } from "../../models";
import { connect } from "../../lib/db";
export const companies = [
  ["Pioneer", "Pioneer Industries", "Pioneer"],
  ["317-graphics", "317 Graphics & Apparel", "317"],
  ["headquarters-on-main", "Headquarters on Main", "HQ"],
  ["fish-properties", "Fish Properties", "Fish"],
] as const;
export async function bootstrap(actor: string) {
  if (!actor.trim()) throw new Error("Bootstrap actor is required");
  await connect();
  await ensureIndexes();
  for (const [_id, name, shortName] of companies)
    await Company.updateOne(
      { _id },
      {
        $setOnInsert: {
          name,
          shortName,
          status: "active",
          baseCurrency: "USD",
          fiscalYearStart: "01-01",
          createdBy: `human:${actor}`,
          updatedBy: `human:${actor}`,
        },
      },
      { upsert: true },
    );
}

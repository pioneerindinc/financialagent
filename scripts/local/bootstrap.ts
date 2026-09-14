import mongoose from "mongoose";
import { bootstrap } from "../../src/domains/companies/bootstrap";
import { withLocalDatabase, fail } from "./common";
async function main() {
  try {
    await withLocalDatabase(async () => bootstrap("dev:local-finance"));
    console.log(
      "Local companies and indexes ready. No accounts, periods or journals seeded.",
    );
  } finally {
    await mongoose.disconnect();
  }
}
main().catch(fail);

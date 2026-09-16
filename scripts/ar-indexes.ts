// Explicit schema preparation only; no companies, users, accounts, periods or balances.
import mongoose from "mongoose";
import { connect } from "../src/lib/db";
import { ArInvoice, ArVersion, ArMapping } from "../src/models";
async function main() {
  try {
    await connect();
    for (const model of [ArInvoice, ArVersion, ArMapping])
      await model.createIndexes();
    console.log(
      "AR collections and unique indexes prepared. No accounting data created.",
    );
  } finally {
    await mongoose.disconnect();
  }
}
void main().catch(() => {
  console.error(
    "AR index preparation failed; review protected database configuration and permissions.",
  );
  process.exitCode = 1;
});

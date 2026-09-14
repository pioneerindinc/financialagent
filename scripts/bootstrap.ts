import mongoose from "mongoose";
import { bootstrap } from "../src/domains/companies/bootstrap";
async function main() {
  try {
    await bootstrap(process.env.BOOTSTRAP_ACTOR || "");
    console.log(
      "Company bootstrap and indexes complete. No financial transactions created.",
    );
  } finally {
    await mongoose.disconnect();
  }
}
main().catch(() => {
  console.error(
    "Bootstrap failed; check database configuration and BOOTSTRAP_ACTOR.",
  );
  process.exitCode = 1;
});

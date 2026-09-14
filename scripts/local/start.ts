import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { withLocalDatabase, root, localDir, fail } from "./common";
import {
  DEV_DATABASE,
  DEV_OPERATOR,
  DEV_ORIGIN,
} from "../../src/lib/development/config";
async function main() {
  await withLocalDatabase(async (client) => {
    const db = client.db(DEV_DATABASE);
    if (
      (await db
        .collection<{ _id: string }>("companies")
        .countDocuments({ _id: { $in: DEV_OPERATOR.companies } })) !== 4
    )
      throw new Error(
        "Company bootstrap is missing. Run npm run dev:bootstrap.",
      );
    for (const [collection, name] of [
      ["accounts", "companyId_1_code_1"],
      ["periods", "companyId_1_startDate_1_endDate_1"],
      [
        "journals",
        "companyId_1_sourceSystem_1_sourceType_1_sourceId_1_sourceRevision_1",
      ],
      ["journals", "companyId_1_reversalOf_1"],
    ]) {
      const indexes = await db.collection(collection).listIndexes().toArray();
      if (!indexes.some((i) => i.name === name && i.unique))
        throw new Error(
          "Required accounting indexes are missing. Run npm run dev:bootstrap.",
        );
    }
  });
  const key = resolve(localDir, "https-key.pem"),
    cert = resolve(localDir, "https-cert.pem");
  if (!existsSync(key) || !existsSync(cert))
    throw new Error("Run npm run dev:setup for local HTTPS certificates.");
  console.log(
    `Starting loopback-only FinancialAgent: ${DEV_ORIGIN}/dev/sign-in. Certificate is local/self-signed; see docs/architecture/local-development.md.`,
  );
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3445",
      "--experimental-https",
      "--experimental-https-key",
      key,
      "--experimental-https-cert",
      cert,
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: "inherit",
      env: {
        ...process.env,
        DEV_AUTH_LOCAL_LAUNCH: "loopback-only",
        FINANCE_LOCAL_DEV_BUILD: "1",
      },
    },
  );
  child.on("error", fail);
  child.on("exit", (code) => {
    process.exitCode = code || 0;
  });
  process.once("SIGINT", () => child.kill("SIGINT"));
  process.once("SIGTERM", () => child.kill("SIGTERM"));
}
main().catch(fail);

import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generate } from "selfsigned";
import {
  root,
  localDir,
  prepareDirectory,
  localEnvironment,
  fail,
} from "./common";
import { DEV_MONGODB_URI, DEV_ORIGIN } from "../../src/lib/development/config";
async function main() {
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "development")
    throw new Error("Setup refuses non-development NODE_ENV.");
  await prepareDirectory();
  const file = resolve(root, ".env.local");
  if (!existsSync(file))
    await writeFile(
      file,
      `MONGODB_URI=${DEV_MONGODB_URI}\nAPP_BASE_URL=${DEV_ORIGIN}\nDEV_AUTH_ENABLED=true\nDEV_AUTH_SECRET=${randomBytes(32).toString("hex")}\nBOOTSTRAP_ACTOR=dev:local-finance\n`,
      { flag: "wx", mode: 0o600 },
    );
  // Never overwrite an existing environment file or silently replace production settings.
  localEnvironment();
  const keyPath = resolve(localDir, "https-key.pem"),
    certPath = resolve(localDir, "https-cert.pem");
  if (!existsSync(keyPath) || !existsSync(certPath)) {
    if (existsSync(keyPath) || existsSync(certPath))
      throw new Error(
        "Incomplete local HTTPS certificate pair. Restore the pair or move both files aside and rerun setup.",
      );
    const cert = await generate(
      [{ name: "commonName", value: "FinancialAgent Local Development" }],
      {
        algorithm: "sha256",
        extensions: [
          { name: "basicConstraints", cA: false },
          { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
          { name: "extKeyUsage", serverAuth: true },
          {
            name: "subjectAltName",
            altNames: [
              { type: 7, ip: "127.0.0.1" },
              { type: 2, value: "localhost" },
            ],
          },
        ],
      },
    );
    await writeFile(keyPath, cert.private, { flag: "wx", mode: 0o600 });
    await writeFile(certPath, cert.cert, { flag: "wx" });
  }
  console.log(
    `Local configuration ready. No secrets printed. Next: npm run dev:db:start (keep that terminal open). URL: ${DEV_ORIGIN}`,
  );
}
main().catch(fail);

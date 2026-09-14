import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import {
  assertDevDatabaseUri,
  DEV_DATABASE,
  DEV_MONGODB_URI,
  DEV_REPLICA_SET,
  developmentConfig,
} from "../../src/lib/development/config";
export const root = resolve(process.cwd());
export const localDir = resolve(root, ".local");
export const controlFile = resolve(localDir, "db-control.json");
export const controlPort = 27292;
export function localEnvironment() {
  if (existsSync(resolve(root, ".env.local")))
    process.loadEnvFile(resolve(root, ".env.local"));
  if (process.env.NODE_ENV && process.env.NODE_ENV !== "development")
    throw new Error("Local tools refuse non-development NODE_ENV.");
  Object.assign(process.env, { NODE_ENV: "development" });
  developmentConfig();
  assertDevDatabaseUri(process.env.MONGODB_URI);
}
export async function prepareDirectory() {
  await mkdir(localDir, { recursive: true });
}
export async function readControl() {
  const data = JSON.parse(await readFile(controlFile, "utf8"));
  if (data.project !== root || !/^[a-f0-9]{64}$/.test(data.token))
    throw new Error(
      "Dev database control file does not belong to this workspace.",
    );
  return data as { project: string; token: string };
}
export async function control(action: "status" | "stop") {
  const state = await readControl();
  const response = await fetch(`http://127.0.0.1:${controlPort}/${action}`, {
    method: action === "stop" ? "POST" : "GET",
    headers: { Authorization: `Bearer ${state.token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok)
    throw new Error(
      "The intended development database controller could not be verified. No unrelated process was touched.",
    );
  const body = await response.json();
  if (body.project !== root || body.database !== DEV_DATABASE)
    throw new Error("Unexpected development database controller.");
  return body;
}
export function assertPrimary(hello: {
  setName?: string;
  isWritablePrimary?: boolean;
}) {
  if (hello.setName !== DEV_REPLICA_SET || !hello.isWritablePrimary)
    throw new Error(
      `Expected primary for ${DEV_REPLICA_SET}. Start npm run dev:db:start and wait for primary readiness. Standalone MongoDB is unsupported.`,
    );
}
export async function withLocalDatabase<T>(
  work: (client: MongoClient) => Promise<T>,
) {
  localEnvironment();
  await control("status");
  const client = new MongoClient(DEV_MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    await client.connect();
    assertPrimary(await client.db("admin").command({ hello: 1 }));
    return await work(client);
  } finally {
    await client.close();
  }
}
export function fail(error: unknown) {
  console.error(
    error instanceof Error
      ? error.message
      : "Local development command failed.",
  );
  process.exitCode = 1;
}

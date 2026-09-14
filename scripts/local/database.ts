import { createServer } from "node:http";
import { createServer as createSocket } from "node:net";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  DEV_DATABASE,
  DEV_MONGO_PORT,
  DEV_REPLICA_SET,
} from "../../src/lib/development/config";
import {
  root,
  localDir,
  controlFile,
  controlPort,
  localEnvironment,
  prepareDirectory,
  control,
  withLocalDatabase,
  fail,
} from "./common";
async function assertFreePort(port: number) {
  const server = createSocket();
  await new Promise<void>((resolve, reject) => {
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is occupied. Refusing to reuse or stop an unverified MongoDB/process.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(() => resolve()));
  });
}
async function start() {
  localEnvironment();
  await prepareDirectory();
  await assertFreePort(DEV_MONGO_PORT);
  const token = randomBytes(32).toString("hex");
  let ready = false;
  let repl: MongoMemoryReplSet | undefined;
  let closing = false;
  const server = createServer(async (request, response) => {
    const supplied = Buffer.from(request.headers.authorization || "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (
      request.socket.remoteAddress !== "127.0.0.1" ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      response.writeHead(403).end();
      return;
    }
    if (!ready) {
      response.writeHead(503).end();
      return;
    }
    if (!(
      (request.method === "GET" && request.url === "/status") ||
      (request.method === "POST" && request.url === "/stop")
    )) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        project: root,
        database: DEV_DATABASE,
        replicaSet: DEV_REPLICA_SET,
        port: DEV_MONGO_PORT,
        ready,
      }),
    );
    if (request.url === "/stop") await stop();
  });
  async function stop() {
    if (closing) return;
    closing = true;
    ready = false;
    await repl?.stop({ doCleanup: false, force: false });
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await unlink(controlFile).catch(() => {});
    console.log("Development MongoDB stopped. Persistent data retained.");
  }
  await new Promise<void>((resolve, reject) => {
    server.once("error", () =>
      reject(
        new Error(
          `Controller port ${controlPort} is occupied; no existing process was changed.`,
        ),
      ),
    );
    server.listen(controlPort, "127.0.0.1", resolve);
  });
  try {
    const dataPath = resolve(localDir, "mongodb");
    await mkdir(dataPath, { recursive: true });
    repl = await MongoMemoryReplSet.create({
      binary: { version: "8.0.12" },
      instanceOpts: [{ port: DEV_MONGO_PORT, dbPath: dataPath }],
      replSet: {
        name: DEV_REPLICA_SET,
        count: 1,
        ip: "127.0.0.1",
        storageEngine: "wiredTiger",
      },
    });
    const actualPort = repl.servers[0].instanceInfo?.port;
    if (actualPort !== DEV_MONGO_PORT)
      throw new Error(
        "MongoDB port changed unexpectedly; refusing to continue.",
      );
    await repl.waitUntilRunning();
    ready = true;
    await writeFile(controlFile, JSON.stringify({ project: root, token }), {
      mode: 0o600,
    });
    process.once("SIGINT", () => void stop());
    process.once("SIGTERM", () => void stop());
    console.log(
      `Primary ready: ${DEV_REPLICA_SET}, 127.0.0.1:${DEV_MONGO_PORT}, ${DEV_DATABASE}. Data: .local/mongodb. Keep this terminal open. Stop: npm run dev:db:stop`,
    );
  } catch (error) {
    await stop();
    throw error;
  }
}
async function main() {
  const action = process.argv[2];
  if (action === "start") return start();
  localEnvironment();
  if (action === "stop") {
    await control("stop");
    console.log("Development database shutdown requested.");
    return;
  }
  if (action === "status") {
    await withLocalDatabase(async () =>
      console.log(
        `PRIMARY READY · ${DEV_DATABASE} · ${DEV_REPLICA_SET} · 127.0.0.1:${DEV_MONGO_PORT}`,
      ),
    );
    return;
  }
  if (action === "reset") {
    console.log(
      `Target: ${DEV_DATABASE} on dedicated loopback replica set, port ${DEV_MONGO_PORT}. All its local records will be deleted.`,
    );
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question(`Type RESET ${DEV_DATABASE} to confirm: `);
    rl.close();
    if (answer !== `RESET ${DEV_DATABASE}`) throw new Error("Reset cancelled.");
    await withLocalDatabase(async (client) => {
      await client.db(DEV_DATABASE).dropDatabase();
    });
    console.log(
      "Only financialagent_dev was reset. Run npm run dev:bootstrap.",
    );
    return;
  }
  throw new Error("Use start, status, stop or reset.");
}
main().catch(fail);

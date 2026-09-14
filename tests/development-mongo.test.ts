import { beforeAll, afterAll, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { connect } from "../src/lib/db";
import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { assertTransactionTopology } from "../src/lib/db-topology";
import { assertPrimary } from "../scripts/local/common";
import { DEV_REPLICA_SET } from "../src/lib/development/config";
let repl: MongoMemoryReplSet;
let standalone: MongoMemoryServer;
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({
    binary: { version: "8.0.12" },
    replSet: { count: 1, name: DEV_REPLICA_SET },
  });
});
afterAll(async () => {
  await mongoose.disconnect();
  vi.unstubAllEnvs();
  await repl?.stop();
  await standalone?.stop();
});
it("shares the first database connection across concurrent page queries", async () => {
  vi.stubEnv("MONGODB_URI", repl.getUri("financialagent_connection_test"));
  await mongoose.disconnect();
  const connections = await Promise.all(
    Array.from({ length: 8 }, () => connect()),
  );
  expect(
    connections.every((c) => c.connection.readyState === 1 && c.connection.db),
  ).toBe(true);
});
it("initializes an isolated primary and commits a transaction", async () => {
  const client = new MongoClient(
    repl.getUri("financialagent_dev_topology_test"),
  );
  try {
    await client.connect();
    const hello = await client.db("admin").command({ hello: 1 });
    expect(() => assertPrimary(hello)).not.toThrow();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await client
          .db()
          .collection("proof")
          .insertOne({ value: "test-only" }, { session });
      });
    } finally {
      await session.endSession();
    }
    expect(await client.db().collection("proof").countDocuments()).toBe(1);
  } finally {
    await client.close();
  }
});
it("clearly rejects a standalone MongoDB server", async () => {
  standalone = await MongoMemoryServer.create({
    binary: { version: "8.0.12" },
  });
  const client = new MongoClient(
    standalone.getUri("financialagent_standalone_test"),
  );
  try {
    await client.connect();
    const hello = await client.db("admin").command({ hello: 1 });
    expect(() => assertTransactionTopology(hello)).toThrow("replica set");
  } finally {
    await client.close();
  }
});
it("rejects wrong replica-set identity", () =>
  expect(() =>
    assertPrimary({ setName: "unrelated", isWritablePrimary: true }),
  ).toThrow());
it("rejects a replica set without an elected primary", () =>
  expect(() =>
    assertPrimary({ setName: DEV_REPLICA_SET, isWritablePrimary: false }),
  ).toThrow());

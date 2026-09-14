import "server-only";
import { mongo } from "mongoose";
import { databaseConfig } from "../config";

export function healthEnvironment() {
  const value = process.env.NODE_ENV;
  return value === "production" || value === "development" || value === "test"
    ? value
    : "unknown";
}

export async function databaseHealth() {
  const environment = healthEnvironment();
  let client: mongo.MongoClient | undefined;
  try {
    // A separate short-lived probe: no model initialization, indexes, sessions,
    // collection reads, bootstrap, or changes to the accounting connection.
    client = new mongo.MongoClient(databaseConfig().MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
      socketTimeoutMS: 2000,
      maxPoolSize: 1,
      retryReads: false,
    });
    await client.connect();
    await client.db().command({ ping: 1 }, { timeoutMS: 1000 });
    const hello = await client
      .db("admin")
      .command({ hello: 1 }, { timeoutMS: 1000 });
    const router = hello.msg === "isdbgrid";
    const transactionReady = Boolean(
      (router || (hello.setName && hello.isWritablePrimary === true)) &&
      typeof hello.logicalSessionTimeoutMinutes === "number" &&
      typeof hello.maxWireVersion === "number" &&
      hello.maxWireVersion >= (router ? 8 : 7),
    );
    // Read-only topology readiness, not proof of write authorization or indexes.
    return { ok: transactionReady, environment, transactionReady };
  } catch {
    // Never return/log a MongoDB error: it can contain credentials, hosts or paths.
    return { ok: false, environment, transactionReady: false };
  } finally {
    await client?.close().catch(() => {});
  }
}

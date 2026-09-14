import mongoose from "mongoose";
import { databaseConfig } from "./config";
import { assertTransactionTopology } from "./db-topology";
export async function connect() {
  const cache = globalThis as typeof globalThis & {
    financialAgentConnection?: Promise<typeof mongoose>;
  };
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    cache.financialAgentConnection ??= mongoose.connect(
      databaseConfig().MONGODB_URI,
      {
        autoIndex: false,
        serverSelectionTimeoutMS: 5000,
      },
    );
    try {
      await cache.financialAgentConnection;
    } finally {
      cache.financialAgentConnection = undefined;
    }
  }
  assertTransactionTopology(
    await mongoose.connection.db!.admin().command({ hello: 1 }),
  );
  return mongoose;
}

// Node-only persistence shared by the server-only bridge and operator CLI.
import { connect } from "../db";
import { z } from "zod";

export const userInput = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9.@_-]{2,99}$/),
  role: z.enum(["admin", "accountant", "viewer"]),
  companies: z
    .array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/))
    .min(1)
    .max(100),
});
export type InternalUser = z.infer<typeof userInput> & {
  _id: string;
  passwordHash: string;
  version: string;
  disabled: boolean;
  createdAt: Date;
};
export type InternalSession = {
  _id: string;
  userId: string;
  version: string;
  expiresAt: Date;
};
type Attempt = { _id: string; count: number; expiresAt: Date };

export async function authStore() {
  const mongoose = await connect();
  const db = mongoose.connection.db!;
  return {
    users: db.collection<InternalUser>("auth_users"),
    sessions: db.collection<InternalSession>("auth_sessions"),
    attempts: db.collection<Attempt>("auth_attempts"),
  };
}

// Explicit operator preparation only; never called by startup/build/login.
export async function ensureAuthIndexes() {
  const store = await authStore();
  await store.users.createIndex({ username: 1 }, { unique: true });
  await store.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await store.sessions.createIndex({ userId: 1 });
  await store.attempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

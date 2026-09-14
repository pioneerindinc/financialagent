import { randomUUID } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { parseArgs } from "node:util";
import mongoose from "mongoose";
import {
  authStore,
  ensureAuthIndexes,
  userInput,
} from "../src/lib/auth/internal-store";
import { hashPassword } from "../src/lib/auth/password";
import { internalConfig } from "../src/lib/auth/internal-config";

async function secretPrompt(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error("Interactive terminal required");
  process.stdout.write(label);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    function done(error?: Error) {
      process.stdin.removeListener("keypress", keypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }
    function keypress(
      text: string,
      key: { name?: string; ctrl?: boolean; meta?: boolean },
    ) {
      if (key.ctrl && key.name === "c") return done(new Error("Cancelled"));
      if (key.name === "return" || key.name === "enter") return done();
      if (key.name === "backspace") {
        value = [...value].slice(0, -1).join("");
        return;
      }
      if (
        !key.ctrl &&
        !key.meta &&
        text &&
        !/[\u0000-\u001f\u007f]/.test(text)
      ) {
        if (Buffer.byteLength(value + text, "utf8") > 256)
          return done(new Error("Password exceeds 256 UTF-8 bytes"));
        value += text;
      }
    }
    process.stdin.on("keypress", keypress);
  });
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      username: { type: "string" },
      companies: { type: "string" },
      role: { type: "string" },
      "expected-database": { type: "string" },
    },
  });
  const command = positionals[0];
  if (
    positionals.length !== 1 ||
    !["first-admin", "create-user", "reset-password", "disable"].includes(
      command,
    )
  )
    throw new Error(
      "Expected first-admin, create-user, reset-password, or disable",
    );
  internalConfig();
  const username = userInput.shape.username.parse(values.username);
  if (!values["expected-database"])
    throw new Error("--expected-database is required");
  const store = await authStore();
  if (mongoose.connection.db!.databaseName !== values["expected-database"])
    throw new Error("Database does not match --expected-database");
  const creating = command === "first-admin" || command === "create-user";
  const assignment = creating
    ? userInput.parse({
        username,
        role: command === "first-admin" ? "admin" : values.role,
        companies: values.companies?.split(","),
      })
    : undefined;
  if (command === "first-admin" && (await store.users.countDocuments({})) !== 0)
    throw new Error(
      "First admin already initialized; use create-user for additional users",
    );
  if (
    command === "create-user" &&
    !(await store.users.findOne({ _id: "internal:first-admin" }))
  )
    throw new Error("Initialize first-admin first");
  if (!creating && !(await store.users.findOne({ username })))
    throw new Error("User not found");

  let passwordHash: string | undefined;
  if (command !== "disable") {
    const password = await secretPrompt(
      "Password (hidden, minimum 15 characters): ",
    );
    const confirmation = await secretPrompt("Confirm password (hidden): ");
    if (password !== confirmation) throw new Error("Passwords do not match");
    passwordHash = await hashPassword(password);
  }
  await ensureAuthIndexes();
  if (creating && assignment && passwordHash) {
    await store.users.insertOne({
      ...assignment,
      _id:
        command === "first-admin"
          ? "internal:first-admin"
          : `internal:${randomUUID()}`,
      passwordHash,
      version: randomUUID(),
      disabled: false,
      createdAt: new Date(),
    });
  } else {
    const updated = await store.users.findOneAndUpdate(
      { username },
      {
        $set: {
          version: randomUUID(),
          ...(command === "disable" ? { disabled: true } : { passwordHash }),
        },
      },
      { returnDocument: "after" },
    );
    if (!updated) throw new Error("User not found");
    await store.sessions.deleteMany({ userId: updated._id });
  }
  process.stdout.write(
    "Auth-only operation completed. No accounting records were changed.\n",
  );
}

main()
  .catch(() => {
    // Driver errors may contain connection details; never print them or password input.
    console.error(
      "Auth-user operation failed. Check command arguments, password requirements, user state, database selection and operator permissions.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

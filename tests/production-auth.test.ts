import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { authStore, ensureAuthIndexes } from "../src/lib/auth/internal-store";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { login, logout } from "../src/lib/auth/internal";
import { humanSession, serviceSession } from "../src/lib/auth/session";
import {
  requestHumanSession,
  assertMutationOrigin,
} from "../src/lib/auth/request";
import { authorize } from "../src/lib/auth/policy";
import { GET, POST } from "../src/app/auth/session/route";
import { POST as signOut } from "../src/app/auth/sign-out/route";
import { SESSION_COOKIE } from "../src/lib/auth/internal-config";
import * as persistence from "../src/lib/auth/internal-store";

const origin = "https://finance.example.test";
const password = randomBytes(24).toString("base64url");
const key = randomBytes(32).toString("hex");
let replica: MongoMemoryReplSet;
let passwordHash: string;
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "8.0.12" },
  });
  vi.stubEnv("MONGODB_URI", replica.getUri("auth_test"));
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_MODE", "internal");
  vi.stubEnv("APP_BASE_URL", origin);
  vi.stubEnv("AUTH_SESSION_SECRET", key);
  await ensureAuthIndexes();
  passwordHash = await hashPassword(password);
});
beforeEach(async () => {
  vi.stubEnv("AUTH_MODE", "internal");
  vi.stubEnv("AUTH_SESSION_SECRET", key);
  const store = await authStore();
  await store.sessions.deleteMany({});
  await store.users.deleteMany({});
  await store.attempts.deleteMany({});
  await store.users.insertOne({
    _id: "internal:test",
    username: "test.operator",
    role: "admin",
    companies: ["pioneer-industries"],
    passwordHash,
    version: randomUUID(),
    disabled: false,
    createdAt: new Date(),
  });
});
afterAll(async () => {
  await mongoose.disconnect();
  await replica?.stop();
  vi.unstubAllEnvs();
});

function request(
  path: string,
  body?: string,
  token?: string,
  requestOrigin = origin,
) {
  return new NextRequest(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin: requestOrigin,
      "content-type": "application/x-www-form-urlencoded",
      ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}),
    },
    body,
  });
}
const credentials = () =>
  new URLSearchParams({ username: "test.operator", password }).toString();

describe("internal production authentication", () => {
  it("rejects unauthenticated requests", async () => {
    expect((await GET(request("/auth/session"))).status).toBe(401);
    await expect(humanSession()).rejects.toMatchObject({ status: 401 });
  });
  it("accepts signed, stored sessions with current permissions", async () => {
    const token = await login("TEST.OPERATOR", password);
    const actor = await humanSession(token);
    expect(actor).toMatchObject({
      kind: "human",
      id: "internal:test",
      scopes: ["finance:read", "finance:write"],
    });
    expect(() =>
      authorize(actor, "pioneer-industries", "finance:write"),
    ).not.toThrow();
    expect(() => authorize(actor, "fish-properties")).toThrow();
    const response = await GET(request("/auth/session", undefined, token));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).not.toMatch(
      /passwordHash|AUTH_SESSION_SECRET|scrypt/,
    );
  });
  it("rejects tampering, expired credentials and signed credentials without a session", async () => {
    const token = await login("test.operator", password);
    await expect(
      humanSession(`${token.slice(0, -10)}abcdefghij`),
    ).rejects.toMatchObject({ status: 401 });
    for (const expires of [
      Math.floor(Date.now() / 1000) - 1,
      Math.floor(Date.now() / 1000) + 60,
    ]) {
      const forged = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(origin)
        .setAudience("finance-internal-session")
        .setSubject("internal:test")
        .setJti(randomUUID())
        .setIssuedAt()
        .setExpirationTime(expires)
        .sign(Buffer.from(key, "hex"));
      await expect(humanSession(forged)).rejects.toMatchObject({ status: 401 });
    }
  });
  it("checks database expiry independent of TTL cleanup", async () => {
    const token = await login("test.operator", password);
    await (
      await authStore()
    ).sessions.updateMany({}, { $set: { expiresAt: new Date(0) } });
    await expect(humanSession(token)).rejects.toMatchObject({ status: 401 });
  });
  it("logout revokes a copied cookie and clears secure browser cookie", async () => {
    const token = await login("test.operator", password);
    const response = await signOut(request("/auth/sign-out", "", token));
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    await expect(humanSession(token)).rejects.toMatchObject({ status: 401 });
    await logout(token);
  });
  it("does not report successful logout when revocation storage fails", async () => {
    const token = await login("test.operator", password);
    const store = await authStore();
    const failure = vi
      .spyOn(store.sessions, "deleteOne")
      .mockRejectedValue(new Error("private database error"));
    const storage = vi.spyOn(persistence, "authStore").mockResolvedValue(store);
    try {
      const response = await signOut(request("/auth/sign-out", "", token));
      expect(response.status).toBe(503);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(await response.text()).toBe(
        '{"error":"Authentication unavailable"}',
      );
    } finally {
      storage.mockRestore();
      failure.mockRestore();
    }
    expect((await humanSession(token)).kind).toBe("human");
  });
  it("issues a host-only secure HttpOnly Strict cookie and rotates prior sessions", async () => {
    const old = await login("test.operator", password);
    const response = await POST(request("/auth/session", credentials(), old));
    expect(response.status).toBe(303);
    const cookie = response.headers.get("set-cookie")!;
    for (const attribute of [
      SESSION_COOKIE,
      "HttpOnly",
      "Secure",
      "SameSite=strict",
      "Max-Age=3600",
      "Path=/",
    ])
      expect(cookie).toContain(attribute);
    expect(cookie).not.toContain("Domain=");
    expect(response.headers.get("location")).toBe(`${origin}/companies`);
    await expect(humanSession(old)).rejects.toMatchObject({ status: 401 });
  });
  it("fails closed on cross-origin or absent-origin login/logout and financial writes", async () => {
    for (const bad of ["https://attacker.example", ""]) {
      expect(
        (await POST(request("/auth/session", credentials(), undefined, bad)))
          .status,
      ).toBe(403);
      expect(
        (await signOut(request("/auth/sign-out", "", undefined, bad))).status,
      ).toBe(403);
    }
    const actor = await humanSession(await login("test.operator", password));
    expect(() => assertMutationOrigin(actor, new Headers())).toThrow();
    expect(() =>
      assertMutationOrigin(actor, new Headers({ origin })),
    ).not.toThrow();
  });
  it("bounds request bodies before parsing or hashing", async () => {
    expect(
      (await POST(request("/auth/session", "x".repeat(4097)))).status,
    ).toBe(413);
  });
  it("rejects development cookies in production even with opt-in", async () => {
    vi.stubEnv("DEV_AUTH_ENABLED", "true");
    await expect(
      requestHumanSession(
        {
          get: (name) =>
            name === "__Host-finance-development"
              ? { value: "dev" }
              : undefined,
        },
        new Headers(),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("keeps services separate from internal human sessions", async () => {
    const service = randomBytes(32).toString("hex");
    vi.stubEnv(
      "SERVICE_CREDENTIALS_JSON",
      JSON.stringify([
        {
          id: "test-service",
          sha256: createHash("sha256").update(service).digest("hex"),
          companies: ["pioneer-industries"],
          scopes: ["finance:read"],
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ]),
    );
    expect(serviceSession(service).kind).toBe("service");
    await expect(humanSession(service)).rejects.toMatchObject({ status: 401 });
    expect(() => serviceSession("human-session-token")).toThrow();
    expect(() =>
      authorize(serviceSession(service), "pioneer-industries", "finance:write"),
    ).toThrow();
  });
  it("applies changed roles and disabled state immediately", async () => {
    const token = await login("test.operator", password);
    const store = await authStore();
    await store.users.updateOne(
      { _id: "internal:test" },
      { $set: { role: "viewer" } },
    );
    const actor = await humanSession(token);
    expect(() =>
      authorize(actor, "pioneer-industries", "finance:write"),
    ).toThrow();
    await store.users.updateOne(
      { _id: "internal:test" },
      { $set: { disabled: true } },
    );
    await expect(humanSession(token)).rejects.toMatchObject({ status: 401 });
    await expect(login("test.operator", password)).rejects.toMatchObject({
      status: 401,
    });
  });
  it("invalidates sessions after a password-version change or signing-key rotation", async () => {
    const token = await login("test.operator", password);
    await (
      await authStore()
    ).users.updateOne(
      { _id: "internal:test" },
      { $set: { version: randomUUID() } },
    );
    await expect(humanSession(token)).rejects.toMatchObject({ status: 401 });
    const next = await login("test.operator", password);
    vi.stubEnv("AUTH_SESSION_SECRET", randomBytes(32).toString("hex"));
    await expect(humanSession(next)).rejects.toMatchObject({ status: 401 });
  });
  it("rejects bad passwords without disclosing account existence", async () => {
    await expect(login("test.operator", "incorrect")).rejects.toMatchObject({
      message: "Invalid username or password",
      status: 401,
    });
    await expect(login("unknown.user", "incorrect")).rejects.toMatchObject({
      message: "Invalid username or password",
      status: 401,
    });
    expect(await verifyPassword(password, passwordHash)).toBe(true);
    expect(await hashPassword(password)).not.toBe(passwordHash);
    await expect(hashPassword("short")).rejects.toThrow();
  });
  it("persists account and global attempt limits", async () => {
    const { attempts } = await authStore();
    const window = Math.floor(Date.now() / 900000);
    const account = createHash("sha256").update("test.operator").digest("hex");
    for (const [id, count] of [
      [account, 10],
      ["global", 60],
    ] as const) {
      await attempts.deleteMany({});
      await attempts.insertOne({
        _id: `${window}:${id}`,
        count,
        expiresAt: new Date(Date.now() + 900000),
      });
      await expect(login("test.operator", password)).rejects.toMatchObject({
        status: 429,
      });
    }
  });
  it("does not enable issuance in external mode or with missing secrets", async () => {
    vi.stubEnv("AUTH_MODE", "external");
    expect((await POST(request("/auth/session", credentials()))).status).toBe(
      404,
    );
    vi.stubEnv("AUTH_MODE", "internal");
    vi.stubEnv("AUTH_SESSION_SECRET", "");
    expect((await POST(request("/auth/session", credentials()))).status).toBe(
      503,
    );
  });
});

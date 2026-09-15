import { test, expect } from "@playwright/test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { generate } from "selfsigned";
import { createServer, type Server } from "node:https";
import { request } from "node:http";
import { createServer as tcpServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import {
  authStore,
  ensureAuthIndexes,
} from "../../src/lib/auth/internal-store";
import { hashPassword } from "../../src/lib/auth/password";

let db: MongoMemoryReplSet;
let proxy: Server;
let app: ChildProcess;
let origin: string;
let passwordHash: string;
const secret = randomBytes(32).toString("hex");
const password = randomBytes(24).toString("base64url");

test.beforeAll(async () => {
  test.setTimeout(120000);
  db = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "8.0.12" },
  });
  process.env.MONGODB_URI = db.getUri("internal_auth_browser_test");
  await ensureAuthIndexes();
  passwordHash = await hashPassword(password);
  await (
    await authStore()
  ).users.insertOne({
    _id: "internal:browser-test",
    username: "browser.test",
    role: "viewer",
    companies: ["pioneer-industries"],
    version: randomUUID(),
    disabled: false,
    passwordHash,
    createdAt: new Date(),
  });
  await mongoose.disconnect();
  const reserve = tcpServer();
  await new Promise<void>((resolve) => reserve.listen(0, "127.0.0.1", resolve));
  const port = (reserve.address() as { port: number }).port;
  await new Promise<void>((resolve) => reserve.close(() => resolve()));
  const cert = await generate([{ name: "commonName", value: "localhost" }], {
    algorithm: "sha256",
  });
  proxy = createServer(
    { key: cert.private, cert: cert.cert },
    (incoming, response) => {
      const upstream = request(
        {
          hostname: "127.0.0.1",
          port,
          path: incoming.url,
          method: incoming.method,
          headers: incoming.headers,
        },
        (result) => {
          response.writeHead(result.statusCode || 500, result.headers);
          result.pipe(response);
        },
      );
      upstream.on("error", () => {
        response.statusCode = 503;
        response.end("Unavailable");
      });
      incoming.pipe(upstream);
    },
  );
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  origin = `https://127.0.0.1:${(proxy.address() as { port: number }).port}`;
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
    {
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "production",
        APP_BASE_URL: origin,
        AUTH_MODE: "internal",
        AUTH_SESSION_SECRET: secret,
        SERVICE_CREDENTIALS_JSON: "[]",
        DEV_AUTH_ENABLED: "true",
      },
    },
  );
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (app.exitCode !== null) throw new Error("Fixture app exited");
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Fixture app did not start");
});

test.afterAll(async () => {
  if (app && app.exitCode === null) {
    const exited = new Promise<void>((resolve) =>
      app.once("exit", () => resolve()),
    );
    app.kill();
    await exited;
  }
  if (proxy) {
    proxy.closeAllConnections();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
  await mongoose.disconnect();
  await db?.stop();
});

test("production HTTPS human login, secret boundaries and revocable logout", async ({
  page,
  context,
}) => {
  await page.goto(`${origin}/companies`);
  await expect(
    page.getByRole("heading", { name: "Sign-in required" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pioneer sign-in" }),
  ).toBeVisible();
  const html = await page.content();
  for (const value of [
    secret,
    passwordHash,
    "AUTH_SESSION_SECRET",
    "SERVICE_CREDENTIALS_JSON",
  ])
    expect(html).not.toContain(value);
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLScriptElement).src),
    );
  for (const url of scripts) {
    const body = await (await context.request.get(url)).text();
    for (const value of [
      secret,
      passwordHash,
      "AUTH_SESSION_SECRET",
      "SERVICE_CREDENTIALS_JSON",
    ])
      expect(body).not.toContain(value);
  }
  expect(
    (
      await context.request.post(`${origin}/auth/session`, {
        form: { username: "browser.test", password },
        headers: { origin: "https://attacker.example" },
      })
    ).status(),
  ).toBe(403);
  expect((await context.request.get(`${origin}/dev/sign-in`)).status()).toBe(
    404,
  );
  expect(
    (
      await context.request.post(`${origin}/dev/session`, { form: {} })
    ).status(),
  ).toBe(404);
  await page.getByLabel("Username").fill("browser.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/companies`);
  const session = (await context.cookies()).find(
    (cookie) => cookie.name === "__Host-finance-session",
  )!;
  expect(session).toMatchObject({
    secure: true,
    httpOnly: true,
    sameSite: "Strict",
    path: "/",
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    session.value,
  );
  const verified = await context.request.get(`${origin}/auth/session`);
  expect(verified.status()).toBe(200);
  expect(await verified.json()).toMatchObject({
    id: "internal:browser-test",
    scopes: ["finance:read"],
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/sign-in`);
  expect(
    (
      await context.request.get(`${origin}/auth/session`, {
        headers: { cookie: `__Host-finance-session=${session.value}` },
      })
    ).status(),
  ).toBe(401);
});

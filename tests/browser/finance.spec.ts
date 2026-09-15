import { test, expect } from "@playwright/test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { generate } from "selfsigned";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createServer, type Server } from "node:https";
import { request } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import mongoose from "mongoose";
import { bootstrap } from "../../src/domains/companies/bootstrap";
let db: MongoMemoryReplSet;
let proxy: Server;
let app: ChildProcess;
let temp: string;
let humanToken: string;
let readerToken: string;
let expiredToken: string;
const company = "pioneer-industries";
test("headers organize posting children and 2027 setup is explicit and repeatable", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "__Host-finance-session",
      value: humanToken,
      domain: "localhost",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto(`/accounts?company=${company}`);
  const create = page
    .locator("form")
    .filter({
      has: page.getByRole("button", { name: "Create account", exact: true }),
    });
  await create.getByLabel("Code", { exact: true }).fill("1800");
  await create.getByLabel("Name", { exact: true }).fill("Header fixture");
  await create.getByLabel("Posting account", { exact: true }).uncheck();
  await expect(
    create.getByLabel("Allow manual posting", { exact: true }),
  ).toBeDisabled();
  await create
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("row").filter({ hasText: "1800" })).toContainText(
    "Header / Non-Posting",
  );
  await create.getByLabel("Code", { exact: true }).fill("1810");
  await create
    .getByLabel("Name", { exact: true })
    .fill("Posting child fixture");
  await expect(
    create.getByLabel("Posting account", { exact: true }),
  ).toBeChecked();
  await create
    .getByLabel("Parent account", { exact: true })
    .selectOption({ label: "1800 · Header fixture" });
  await create
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("row").filter({ hasText: "1810" })).toContainText(
    "↳ Posting child fixture",
  );
  await page.goto(`/journal?company=${company}`);
  const options = page
    .getByRole("combobox", { name: "Account", exact: true })
    .first()
    .locator("option");
  await expect(
    options.filter({ hasText: "1810 · Posting child fixture" }),
  ).toHaveCount(1);
  await expect(
    options.filter({ hasText: "1800 · Header fixture" }),
  ).toHaveCount(0);
  const before = await (
    await context.request.get(`/api/finance?company=${company}`)
  ).json();
  expect(before.periods).toHaveLength(0);
  await page.goto(`/periods?company=${company}`);
  await expect(
    page.getByText(/planned accounting start is 01-01-2027/),
  ).toBeVisible();
  await page
    .getByText("Review the 12 monthly periods", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "02-28-2027", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Setup reason")
    .fill("Explicit disposable browser fixture setup");
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Create missing 2027 periods" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "2027 monthly setup complete",
  );
  const first = await (
    await context.request.get(`/api/finance?company=${company}`)
  ).json();
  expect(first.periods).toHaveLength(12);
  expect(
    first.periods.every(
      (p: { startDate: string; status: string }) =>
        p.startDate.startsWith("2027-") && p.status === "open",
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Create missing 2027 periods" })
    .click();
  await expect(
    page.getByRole("button", { name: "Create missing 2027 periods" }),
  ).toBeEnabled();
  const repeated = await (
    await context.request.get(`/api/finance?company=${company}`)
  ).json();
  expect(repeated.periods).toEqual(first.periods);
  await page.goto("/periods?company=317-graphics");
  await expect(
    page.getByRole("heading", {
      name: "Pioneer Industries · 2027 accounting setup",
    }),
  ).toHaveCount(0);
});
test("account governance editor and manual selection enforce visible policy", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "__Host-finance-session",
      value: humanToken,
      domain: "localhost",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto(`/accounts?company=${company}`);
  const create = page.locator("form").filter({
    has: page.getByRole("button", { name: "Create account", exact: true }),
  });
  await create.getByLabel("Code", { exact: true }).fill("1900");
  await create.getByLabel("Name", { exact: true }).fill("Governance fixture");
  await create.getByLabel("Control account", { exact: true }).check();
  await expect(
    create.getByLabel("Allow manual posting", { exact: true }),
  ).not.toBeChecked();
  await create
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    create.getByLabel("Control account", { exact: true }),
  ).not.toBeChecked();
  await expect(
    create.getByLabel("Allow manual posting", { exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("row").filter({ hasText: "1900" })).toContainText(
    "No manual posting",
  );
  await page.goto(`/journal?company=${company}`);
  await expect(page.getByRole("heading", { name: /New draft/ })).toBeVisible();
  expect(
    await page
      .getByRole("combobox", { name: "Account", exact: true })
      .first()
      .locator("option")
      .allTextContents(),
  ).not.toContain("1900 · Governance fixture");
  await page.goto(`/accounts?company=${company}`);
  await page.getByRole("button", { name: "Edit 1900", exact: true }).click();
  const edit = page.locator("form").filter({
    has: page.getByRole("button", { name: "Save account", exact: true }),
  });
  await edit.getByLabel("Name", { exact: true }).fill("Renamed control");
  await edit.getByLabel("Active account", { exact: true }).uncheck();
  await edit
    .getByLabel("Change reason", { exact: true })
    .fill("Reviewed deactivation");
  await edit.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "1900" })).toContainText(
    "Inactive",
  );
  await page.getByRole("button", { name: "Edit 1900", exact: true }).click();
  await edit.getByLabel("Active account", { exact: true }).check();
  await edit.getByLabel("Allow manual posting", { exact: true }).check();
  await edit
    .getByLabel("Change reason", { exact: true })
    .fill("Approved manual exception");
  await edit.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "1900" })).toContainText(
    "Manual posting allowed",
  );
  await page.goto(`/journal?company=${company}`);
  await expect(page.getByRole("heading", { name: /New draft/ })).toBeVisible();
  await expect(
    page
      .getByRole("combobox", { name: "Account", exact: true })
      .first()
      .locator("option", { hasText: "1900 · Renamed control" }),
  ).toHaveCount(1);
});
test.beforeAll(async () => {
  test.setTimeout(120000);
  db = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "8.0.12" },
  });
  process.env.MONGODB_URI = db.getUri("financialagent_browser_test");
  await bootstrap("browser-fixture");
  await mongoose.disconnect();
  const cert = await generate([{ name: "commonName", value: "localhost" }], {
    algorithm: "sha256",
    extensions: [
      { name: "basicConstraints", cA: true },
      { name: "subjectAltName", altNames: [{ type: 2, value: "localhost" }] },
    ],
  });
  temp = await mkdtemp(join(tmpdir(), "finance-browser-"));
  const ca = join(temp, "ca.pem");
  await writeFile(ca, cert.cert);
  const keys = await generateKeyPair("RS256");
  const publicKey = {
    ...(await exportJWK(keys.publicKey)),
    kid: "fixture",
    alg: "RS256",
    use: "sig",
  };
  async function token(scopes: string[], expired = false) {
    return new SignJWT({ companies: [company, "317-graphics"], scopes })
      .setProtectedHeader({ alg: "RS256", kid: "fixture" })
      .setSubject("browser-accountant")
      .setIssuer("https://localhost:3444")
      .setAudience("finance-test")
      .setIssuedAt()
      .setExpirationTime(expired ? Math.floor(Date.now() / 1000) - 60 : "30m")
      .sign(keys.privateKey);
  }
  humanToken = await token(["finance:read", "finance:write"]);
  readerToken = await token(["finance:read"]);
  expiredToken = await token(["finance:read"], true);
  proxy = createServer(
    { key: cert.private, cert: cert.cert },
    (incoming, response) => {
      if (incoming.url === "/jwks") {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ keys: [publicKey] }));
        return;
      }
      const upstream = request(
        {
          hostname: "127.0.0.1",
          port: 3105,
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
        response.end("Starting");
      });
      incoming.pipe(upstream);
    },
  );
  await new Promise<void>((resolve) =>
    proxy.listen(3444, "localhost", resolve),
  );
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-p",
      "3105",
      "-H",
      "127.0.0.1",
    ],
    {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: "pipe",
      env: {
        ...process.env,
        NODE_EXTRA_CA_CERTS: ca,
        APP_BASE_URL: "https://localhost:3444",
        AUTH_ISSUER: "https://localhost:3444",
        AUTH_AUDIENCE: "finance-test",
        AUTH_JWKS_URL: "https://localhost:3444/jwks",
        SERVICE_CREDENTIALS_JSON: "[]",
      },
    },
  );
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch("http://127.0.0.1:3105");
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Fixture production server did not start");
});
test.afterAll(async () => {
  app?.kill();
  if (proxy) {
    proxy.closeAllConnections();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
  await mongoose.disconnect();
  await db?.stop();
  if (
    temp &&
    dirname(resolve(temp)) === resolve(tmpdir()) &&
    basename(temp).startsWith("finance-browser-")
  )
    await rm(temp, { recursive: true, force: true });
});
test("unauthenticated pages and APIs deny financial access", async ({
  page,
  request,
}) => {
  expect((await request.get("/dev/sign-in")).status()).toBe(404);
  expect((await request.post("/dev/session", { form: {} })).status()).toBe(404);
  for (const path of [
    "/",
    "/companies",
    "/accounts",
    "/periods",
    "/journal",
    "/journal/unknown",
    "/reports/trial-balance",
    "/reports/general-ledger",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Sign-in required" }),
    ).toBeVisible();
  }
  expect((await request.get(`/api/finance?company=${company}`)).status()).toBe(
    401,
  );
  expect(
    (
      await request.post("/api/finance", {
        data: {
          companyId: company,
          action: "journal.post",
          id: "unknown",
          revision: 0,
        },
      })
    ).status(),
  ).toBe(401);
});
test("authenticated accountant completes draft, post, reports and reversal", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "__Host-finance-session",
      value: humanToken,
      domain: "localhost",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.goto(`/accounts?company=${company}`);
  await expect(
    page.getByRole("heading", { name: "Create account · Pioneer Industries" }),
  ).toBeVisible();
  for (const [code, name, type] of [
    ["1000", "Cash", "Asset"],
    ["3000", "Equity", "Equity"],
  ]) {
    await page.getByLabel("Code", { exact: true }).fill(code);
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Type", { exact: true }).selectOption(type);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      page.getByRole("cell", { name, exact: true }).first(),
    ).toBeVisible();
  }
  await page.goto(`/periods?company=${company}`);
  await page.getByLabel("Start", { exact: true }).fill("02-30-2026");
  expect(
    await page
      .getByLabel("Start", { exact: true })
      .evaluate((element: HTMLInputElement) => element.validity.valid),
  ).toBe(false);
  await page.getByLabel("Start", { exact: true }).fill("01-01-2026");
  await page.getByLabel("End", { exact: true }).fill("12-31-2026");
  await page.getByRole("button", { name: "Create period" }).click();
  await expect(page.getByText("01-01-2026 — 12-31-2026 · open")).toBeVisible();
  await page.goto(`/journal?company=${company}`);
  await page.getByLabel("Transaction date").fill("01-15-2026");
  await page.getByLabel("Description", { exact: true }).fill("Browser journal");
  await page
    .getByLabel("Account", { exact: true })
    .nth(0)
    .selectOption({ label: "1000 · Cash" });
  await page
    .getByLabel("Account", { exact: true })
    .nth(1)
    .selectOption({ label: "3000 · Equity" });
  await page.getByLabel("Debit ($)", { exact: true }).nth(0).fill("123.456");
  await page.getByLabel("Credit ($)", { exact: true }).nth(1).fill("123.45");
  await page.getByRole("button", { name: "Save balanced draft" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "at most two decimal places" }),
  ).toBeVisible();
  await page.getByLabel("Debit ($)", { exact: true }).nth(0).fill("123.45");
  await page.getByRole("button", { name: "Save balanced draft" }).click();
  await expect(page.getByText("Draft saved.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Review entry →" }).first().click();
  await expect(page.getByLabel("Transaction date")).toHaveValue("01-15-2026");
  await expect(
    page.getByLabel("Debit ($)", { exact: true }).nth(0),
  ).toHaveValue("123.45");
  await expect(
    page.getByLabel("Credit ($)", { exact: true }).nth(1),
  ).toHaveValue("123.45");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Post reviewed journal" }).click();
  await expect(
    page.getByRole("button", { name: "Reverse journal", exact: true }),
  ).toBeVisible();
  const originalUrl = page.url();
  await page.goto(`/reports/trial-balance?company=${company}`);
  await expect(
    page.getByRole("heading", { name: "Trial Balance", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tfoot")).toContainText("$123.45");
  await page.getByLabel("As of", { exact: true }).fill("01-14-2026");
  await expect(page.locator("tfoot")).toContainText("$0.00");
  await page.getByLabel("As of", { exact: true }).fill("01-31-2026");
  await expect(page.locator("tfoot")).toContainText("$123.45");
  await page.goto(`/reports/general-ledger?company=${company}`);
  await expect(
    page.getByRole("cell", { name: /Browser journal/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /01-15-2026/ }).first(),
  ).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("01-16-2026");
  await expect(page.getByRole("cell", { name: /Browser journal/ })).toHaveCount(
    0,
  );
  await page.getByLabel("From", { exact: true }).fill("01-01-2026");
  await page.getByLabel("Through", { exact: true }).fill("01-31-2026");
  await expect(
    page.getByRole("cell", { name: /Browser journal/ }).first(),
  ).toBeVisible();
  await page.goto(originalUrl);
  await page.getByLabel("Reversal date").fill("01-20-2026");
  await page.getByLabel("Reason", { exact: true }).fill("Browser correction");
  await page
    .getByRole("button", { name: "Reverse journal", exact: true })
    .click();
  await expect(page.getByText("Reversed by", { exact: false })).toBeVisible();
  await page.goto(`/reports/trial-balance?company=${company}`);
  await expect(page.locator("tfoot")).toContainText("$0.00");
  await page.getByLabel("Active company").selectOption("317-graphics");
  await expect(page.locator("header strong")).toHaveText(
    "317 Graphics & Apparel",
  );
  await expect(page.getByRole("cell", { name: "1000 · Cash" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Active company")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
test("verified read-only user cannot write; invalid origin and expired sessions fail", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "__Host-finance-session",
      value: readerToken,
      domain: "localhost",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto(`/accounts?company=${company}`);
  await expect(
    page.getByRole("heading", { name: "Chart of Accounts", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toHaveCount(0);
  const response = await context.request.post("/api/finance", {
    headers: { Origin: "https://localhost:3444" },
    data: {
      companyId: company,
      action: "account.create",
      data: { code: "9999", name: "Forbidden", type: "Asset" },
    },
  });
  expect(response.status()).toBe(403);
  await context.addCookies([
    {
      name: "__Host-finance-session",
      value: humanToken,
      domain: "localhost",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  expect(
    (
      await context.request.post("/api/finance", {
        headers: { Origin: "https://untrusted.invalid" },
        data: { companyId: company, action: "period.create", data: {} },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await context.request.get("/api/finance?company=fish-properties")
    ).status(),
  ).toBe(403);
  await context.addCookies([
    {
      name: "__Host-finance-session",
      value: expiredToken,
      domain: "localhost",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  expect(
    (await context.request.get(`/api/finance?company=${company}`)).status(),
  ).toBe(401);
});

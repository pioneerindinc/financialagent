import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { withLocalDatabase, localDir } from "../../scripts/local/common";
import { DEV_COOKIE, DEV_DATABASE } from "../../src/lib/development/config";
test("local sign-in and a fully attributed accounting cycle through the UI", async ({
  page,
  context,
}) => {
  const company = "pioneer-industries";
  const marker = `DEV VALIDATION ${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  await page.goto("/dev/sign-in");
  await expect(
    page.getByRole("heading", { name: "Local FinancialAgent Session" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sign in as Local Finance Developer" })
    .click();
  await expect(page.getByRole("status")).toContainText("Development Session");
  const cookie = (await context.cookies()).find((c) => c.name === DEV_COOKIE);
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.sameSite).toBe("Strict");
  await page.getByLabel("Active company").selectOption(company);
  await expect(page.locator("header strong")).toHaveText("Pioneer Industries");
  await page.goto(`/accounts?company=${company}`);
  for (const [suffix, type] of [
    ["CASH", "Asset"],
    ["EQUITY", "Equity"],
  ]) {
    await page
      .getByLabel("Code", { exact: true })
      .fill(`${marker.replace("DEV VALIDATION ", "DV")}-${suffix}`);
    await page.getByLabel("Name", { exact: true }).fill(`${marker} ${suffix}`);
    await page.getByLabel("Type", { exact: true }).selectOption(type);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      page.getByRole("cell", { name: `${marker} ${suffix}`, exact: true }),
    ).toBeVisible();
  }
  const overview = await (
    await context.request.get(`/api/finance?company=${company}`)
  ).json();
  if (
    !overview.periods.some(
      (p: { startDate: string; endDate: string; status: string }) =>
        p.startDate <= today && p.endDate >= today && p.status === "open",
    )
  ) {
    await page.goto(`/periods?company=${company}`);
    await page.getByLabel("Start", { exact: true }).fill(`01-01-${year}`);
    await page.getByLabel("End", { exact: true }).fill(`12-31-${year}`);
    await page.getByRole("button", { name: "Create period" }).click();
    await expect(
      page.getByText(`01-01-${year} — 12-31-${year} · open`),
    ).toBeVisible();
  }
  await page.goto(`/journal?company=${company}`);
  await page.getByLabel("Description", { exact: true }).fill(marker);
  await page
    .getByLabel("Account", { exact: true })
    .nth(0)
    .selectOption({
      label: `${marker.replace("DEV VALIDATION ", "DV")}-CASH · ${marker} CASH`,
    });
  await page
    .getByLabel("Account", { exact: true })
    .nth(1)
    .selectOption({
      label: `${marker.replace("DEV VALIDATION ", "DV")}-EQUITY · ${marker} EQUITY`,
    });
  await page.getByLabel("Debit ($)", { exact: true }).nth(0).fill("123.45");
  await page.getByLabel("Credit ($)", { exact: true }).nth(1).fill("123.45");
  await page.getByRole("button", { name: "Save balanced draft" }).click();
  await expect(page.getByText("Draft saved.", { exact: false })).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: marker })
    .getByRole("link", { name: "Review entry →" })
    .click();
  await expect(page).toHaveURL(/\/journal\/[^?]+\?company=/);
  const originalUrl = page.url();
  const journalId = new URL(originalUrl).pathname.split("/").at(-1)!;
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Post reviewed journal" }).click();
  await expect(
    page.getByRole("button", { name: "Reverse journal", exact: true }),
  ).toBeVisible();
  await page.goto(`/reports/trial-balance?company=${company}`);
  await expect(
    page.getByRole("row").filter({ hasText: `${marker} CASH` }),
  ).toContainText("$123.45");
  await page.goto(`/reports/general-ledger?company=${company}`);
  await expect(
    page.getByRole("cell", { name: new RegExp(marker) }).first(),
  ).toBeVisible();
  await page.goto(originalUrl);
  await page.getByLabel("Reason", { exact: true }).fill(`${marker} reversal`);
  await page
    .getByRole("button", { name: "Reverse journal", exact: true })
    .click();
  await expect(page.getByText("Reversed by", { exact: false })).toBeVisible();
  await page.goto(`/reports/trial-balance?company=${company}`);
  await expect(
    page.getByRole("row").filter({ hasText: `${marker} CASH` }),
  ).not.toContainText("$123.45");
  await withLocalDatabase(async (client) => {
    const db = client.db(DEV_DATABASE);
    const audit = await db.collection("audits").findOne({
      companyId: company,
      entityId: journalId,
      action: "journal.post",
    });
    expect(audit?.createdBy).toBe("human:dev:local-finance");
    const journal = await db
      .collection<{ _id: string; status: string }>("journals")
      .findOne({ _id: journalId });
    expect(journal?.status).toBe("posted");
  });
  await writeFile(
    resolve(localDir, "validation-entry.json"),
    JSON.stringify({ journalId, companyId: company, marker }),
  );
  await page.getByRole("button", { name: "End development session" }).click();
  await expect(
    page.getByRole("heading", { name: "Local FinancialAgent Session" }),
  ).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === DEV_COOKIE)).toBe(
    false,
  );
});
test("previously validated journal persists across local app and database restarts", async ({
  page,
}) => {
  const record = JSON.parse(
    await readFile(resolve(localDir, "validation-entry.json"), "utf8"),
  );
  expect(record.companyId).toBe("pioneer-industries");
  await page.goto("/dev/sign-in");
  await page
    .getByRole("button", { name: "Sign in as Local Finance Developer" })
    .click();
  await page.goto(
    `/journal/${encodeURIComponent(record.journalId)}?company=pioneer-industries`,
  );
  await expect(
    page.getByRole("heading", { name: record.marker, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Reversed by", { exact: false })).toBeVisible();
});

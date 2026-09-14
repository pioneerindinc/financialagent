import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { add, subtract, cents, formatMoney } from "../src/lib/money";
import { humanSession, serviceSession } from "../src/lib/auth/session";
import { authorize, type Actor } from "../src/lib/auth/policy";
afterEach(() => vi.unstubAllEnvs());
describe("exact money", () => {
  it("adds cents exactly", () => expect(add(10, 20)).toBe(30));
  it("subtracts cents exactly", () => expect(subtract(20, 30)).toBe(-10));
  it("formats zero", () => expect(formatMoney(0)).toBe("$0.00"));
  it("formats negative amounts", () =>
    expect(formatMoney(-12345)).toBe("-$123.45"));
  it("formats maximum integer without rounding", () =>
    expect(formatMoney(Number.MAX_SAFE_INTEGER)).toBe(
      "$90,071,992,547,409.91",
    ));
  it.each([0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid money %s",
    (value) => expect(() => cents(value)).toThrow(),
  );
  it("rejects sum overflow", () =>
    expect(() => add(Number.MAX_SAFE_INTEGER, 1)).toThrow());
  it("rejects difference overflow", () =>
    expect(() => subtract(-Number.MAX_SAFE_INTEGER, 1)).toThrow());
});
describe("auth boundaries", () => {
  const token = "a".repeat(48);
  function setup(extra = {}) {
    vi.stubEnv(
      "SERVICE_CREDENTIALS_JSON",
      JSON.stringify([
        {
          id: "erp",
          sha256: createHash("sha256").update(token).digest("hex"),
          companies: ["pioneer-industries"],
          scopes: ["finance:source:write"],
          expiresAt: "2099-01-01T00:00:00Z",
          ...extra,
        },
      ]),
    );
  }
  it("rejects missing human session", async () => {
    await expect(humanSession()).rejects.toThrow("Authentication required");
  });
  it("rejects forged human session", async () => {
    await expect(humanSession("forged")).rejects.toThrow("Invalid");
  });
  it("validates configured service token", () => {
    setup();
    expect(serviceSession(token).id).toBe("erp");
  });
  it("rejects wrong service token", () => {
    setup();
    expect(() => serviceSession("b".repeat(48))).toThrow("Invalid");
  });
  it("rejects expired service token", () => {
    setup({ expiresAt: "2000-01-01T00:00:00Z" });
    expect(() => serviceSession(token)).toThrow("Invalid");
  });
  it("rejects unconfigured service access", () => {
    vi.stubEnv("SERVICE_CREDENTIALS_JSON", "[]");
    expect(() => serviceSession(token)).toThrow("Invalid");
  });
  it("rejects broad service write scope", () => {
    setup({ scopes: ["finance:write"] });
    expect(() => serviceSession(token)).toThrow();
  });
  it("denies services posting even with forged broad scope", () => {
    const actor: Actor = {
      id: "service",
      kind: "service",
      companies: ["pioneer-industries"],
      scopes: ["finance:write"],
    };
    expect(() =>
      authorize(actor, "pioneer-industries", "finance:write"),
    ).toThrow("Human");
  });
});

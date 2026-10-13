import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import * as route from "../src/app/api/ar/preview/route";
import { previewInvoices } from "../src/domains/ar/preview";
import { invoice } from "./ar-fixtures";

const guards = vi.hoisted(() => ({
  connect: vi.fn(() => {
    throw new Error("Unexpected database connection");
  }),
  write: vi.fn(() => {
    throw new Error("Unexpected persistence operation");
  }),
  importMutationModule: vi.fn(() => {
    throw new Error("Preview imported a mutation module");
  }),
  sessionRead: vi.fn(),
  userRead: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ connect: guards.connect }));
vi.mock("../src/models", () => guards.importMutationModule());
vi.mock("../src/domains/ar/service", () => guards.importMutationModule());
vi.mock("../src/domains/accounting/service", () =>
  guards.importMutationModule(),
);
vi.mock("../src/lib/auth/internal-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/auth/internal-store")>();
  const collection = (read?: typeof guards.sessionRead) =>
    new Proxy(
      {},
      {
        get: (_, key) => (key === "findOne" && read ? read : guards.write),
      },
    );
  return {
    ...actual,
    authStore: async () => ({
      sessions: collection(guards.sessionRead),
      users: collection(guards.userRead),
      attempts: collection(),
    }),
  };
});

const company = "pioneer-industries";
const origin = "https://finance-preview.example.test";
const secret = "1".repeat(64);
const key = "fixture-preview-erp-key";
const query = { company, from: "2026-10-01", to: "2026-10-12", limit: "50" };
let token: string;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
const record = (index = 1) =>
  invoice({
    sourceId: index.toString(16).padStart(64, "0"),
    invoiceDate: "2026-10-05",
    issuedAt: "2026-10-05T12:00:00.000Z",
  });
function page(records = [record()], pagination = {}) {
  return {
    contract: "pioneer-customer-invoices-v1",
    capturedAt: "2026-10-12T12:00:00.000Z",
    period: { from: query.from, to: query.to, includesUndated: true },
    sourceConsistency: "mongo-snapshot-per-request",
    records,
    pagination: {
      total: records.length,
      limit: 50,
      scanRevision: "a".repeat(64),
      nextCursor: null,
      complete: true,
      ...pagination,
    },
  };
}
function request(overrides = {}, session: string | null = token, extra = "") {
  return new NextRequest(
    `${origin}/api/ar/preview?${new URLSearchParams({ ...query, ...overrides })}${extra}`,
    {
      headers:
        session === null ? {} : { cookie: `__Host-finance-session=${session}` },
    },
  );
}
async function failure(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(Object.keys(body)).toEqual(["error"]);
  expect(body.error).toEqual(expect.any(String));
  expect(JSON.stringify(body)).not.toContain(key);
  expect(JSON.stringify(body)).not.toContain("UPSTREAM-SECRET");
  return body;
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_MODE", "internal");
  vi.stubEnv("APP_BASE_URL", origin);
  vi.stubEnv("AUTH_SESSION_SECRET", secret);
  vi.stubEnv("DEV_AUTH_ENABLED", "false");
  vi.stubEnv("PIONEER_AR_COMPANY_ID", company);
  vi.stubEnv("PIONEER_ERP_BASE_URL", "https://erp-preview.example.test");
  vi.stubEnv("FINANCIAL_AGENT_API_KEY", key);
  // Every HTTP request is mocked; no live ERP or application database is used.
  fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error("Unconfigured fixture HTTP call"));
  vi.stubGlobal("fetch", fetcher);
  token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("preview-reader")
    .setJti("fixture-session")
    .setIssuer(origin)
    .setAudience("finance-internal-session")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(Buffer.from(secret, "hex"));
  guards.sessionRead.mockResolvedValue({
    userId: "preview-reader",
    version: "v1",
  });
  guards.userRead.mockResolvedValue({
    _id: "preview-reader",
    username: "preview.reader",
    role: "viewer",
    companies: [company],
  });
});
afterEach(() => {
  expect(guards.connect).not.toHaveBeenCalled();
  expect(guards.write).not.toHaveBeenCalled();
  expect(guards.importMutationModule).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("read-only live ERP preview", () => {
  it("validates a real signed reader session and returns only complete, minimized source data", async () => {
    fetcher.mockResolvedValueOnce(Response.json(page()));
    const response = await route.GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({
      from: query.from,
      to: query.to,
      limit: 50,
      complete: true,
      invoiceCount: 1,
      lineCount: 2,
      invoices: [
        {
          sourceId: record().sourceId,
          invoiceNumber: "FIXTURE-1",
          customer: "Fixture customer",
          invoiceDate: "2026-10-05",
          totalAmountCents: 10500,
          sourceRevision: "1".repeat(64),
        },
      ],
    });
    expect(guards.sessionRead).toHaveBeenCalledTimes(1);
    expect(guards.userRead).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe(
      "/api/integrations/financial-agent/customer-invoices",
    );
    expect(options?.method || "GET").toBe("GET");
    expect(options).toMatchObject({
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      redirect: "error",
    });
  });
  it("rejects missing, invalid and revoked sessions before contacting ERP", async () => {
    await failure(await route.GET(request({}, null)), 401);
    await failure(await route.GET(request({}, "invalid")), 401);
    guards.sessionRead.mockResolvedValueOnce(null);
    await failure(await route.GET(request()), 401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not accept a service bearer in place of a human session", async () => {
    const req = request({}, null);
    req.headers.set("authorization", `Bearer ${key}`);
    await failure(await route.GET(req), 401);
    await expect(
      previewInvoices(
        {
          id: "service",
          kind: "service",
          companies: [company],
          scopes: ["finance:read"],
        },
        company,
        {},
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires finance:read even when another scope is present", async () => {
    await expect(
      previewInvoices(
        {
          id: "human",
          kind: "human",
          companies: [company],
          scopes: ["finance:write"],
        },
        company,
        query,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects foreign assignments, other companies and a mismatched binding", async () => {
    guards.userRead.mockResolvedValueOnce({
      _id: "reader",
      username: "reader",
      role: "viewer",
      companies: ["317-graphics"],
    });
    await failure(await route.GET(request()), 403);
    guards.userRead.mockResolvedValueOnce({
      _id: "reader",
      username: "reader",
      role: "viewer",
      companies: ["317-graphics"],
    });
    await failure(await route.GET(request({ company: "317-graphics" })), 403);
    vi.stubEnv("PIONEER_AR_COMPANY_ID", "317-graphics");
    await failure(await route.GET(request()), 403);
    vi.stubEnv("PIONEER_AR_COMPANY_ID", "");
    await failure(await route.GET(request()), 503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { from: "2026-02-30" },
    { from: "" },
    { from: "2026-10-13" },
    { to: "2028-01-01" },
    { limit: "0" },
    { limit: "101" },
    { limit: "-1" },
    { limit: "1.5" },
    { limit: "NaN" },
    { limit: "" },
    { unexpected: "value" },
  ])("rejects invalid query %j before ERP retrieval", async (overrides) => {
    await failure(await route.GET(request(overrides)), 400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects missing and duplicate query parameters", async () => {
    const missing = request();
    missing.nextUrl.searchParams.delete("from");
    await failure(await route.GET(missing), 400);
    await failure(await route.GET(request({}, token, "&limit=10")), 400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 403, 503])(
    "handles ERP %s without exposing upstream bodies",
    async (status) => {
      fetcher.mockResolvedValueOnce(
        new Response(`UPSTREAM-SECRET ${key}`, { status }),
      );
      await failure(await route.GET(request()), status);
    },
  );
  it.each([
    new DOMException("Fixture timeout", "TimeoutError"),
    new Error("Source unavailable"),
  ])("handles unavailable/timeout retrieval", async (error) => {
    fetcher.mockRejectedValueOnce(error);
    await failure(await route.GET(request()), 503);
  });
  it("fails closed on missing server configuration", async () => {
    vi.stubEnv("FINANCIAL_AGENT_API_KEY", "");
    await failure(await route.GET(request()), 503);
    vi.stubEnv("PIONEER_ERP_BASE_URL", "");
    await failure(await route.GET(request()), 503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects invalid contracts and incomplete pagination without any invoice result", async () => {
    for (const body of [
      { ...page(), contract: "incorrect" },
      page([invoice({ company: "foreign" as "pioneer" })]),
      page([], { total: 1 }),
      page([], { complete: false }),
    ]) {
      fetcher.mockResolvedValueOnce(Response.json(body));
      await failure(await route.GET(request()), 502);
    }
  });
  it("returns all pages for a complete window within the requested maximum", async () => {
    fetcher.mockResolvedValueOnce(
      Response.json(
        page([record(1)], {
          total: 2,
          nextCursor: "page-two",
          complete: false,
        }),
      ),
    );
    fetcher.mockResolvedValueOnce(
      Response.json(page([record(2)], { total: 2 })),
    );
    const response = await route.GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      complete: true,
      invoiceCount: 2,
      lineCount: 4,
    });
    expect(
      new URL(String(fetcher.mock.calls[1][0])).searchParams.get("cursor"),
    ).toBe("page-two");
  });
  it("rejects a 51-invoice window at maximum 50 without silently truncating", async () => {
    fetcher.mockResolvedValueOnce(
      Response.json(
        page(
          Array.from({ length: 50 }, (_, i) => record(i + 1)),
          { total: 51, nextCursor: "last", complete: false },
        ),
      ),
    );
    fetcher.mockResolvedValueOnce(
      Response.json(page([record(51)], { total: 51 })),
    );
    const body = await failure(await route.GET(request()), 413);
    expect(body.error).toContain("maximum of 50 invoices");
    expect(body.error).toContain("no partial preview");
  });
  it.each(["timeout", "invalid", "incomplete"])(
    "discards earlier pages when the final page is %s",
    async (mode) => {
      fetcher.mockResolvedValueOnce(
        Response.json(
          page([record()], { total: 2, nextCursor: "next", complete: false }),
        ),
      );
      if (mode === "timeout")
        fetcher.mockRejectedValueOnce(
          new DOMException("Timeout", "TimeoutError"),
        );
      else
        fetcher.mockResolvedValueOnce(
          Response.json(
            mode === "invalid"
              ? { error: "UPSTREAM-SECRET" }
              : page([], { total: 2 }),
          ),
        );
      await failure(await route.GET(request()), mode === "timeout" ? 503 : 502);
    },
  );
  it("reports a complete empty window without creating any records", async () => {
    fetcher.mockResolvedValueOnce(Response.json(page([])));
    const response = await route.GET(request());
    expect(await response.json()).toMatchObject({
      complete: true,
      invoiceCount: 0,
      lineCount: 0,
      invoices: [],
    });
  });
  it("does not export mutations and rejects HEAD/OPTIONS without scanning", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"])
      expect(route).not.toHaveProperty(method);
    for (const handler of [route.HEAD, route.OPTIONS]) {
      expect(handler().status).toBe(405);
      expect(handler().headers.get("allow")).toBe("GET");
    }
    expect(fetcher).not.toHaveBeenCalled();
    expect(guards.sessionRead).not.toHaveBeenCalled();
  });
});

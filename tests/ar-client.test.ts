import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scanInvoices } from "../src/domains/ar/client";
import { erpConnection } from "../src/domains/ar/config";
import { financialInvoicePageSchema } from "../src/domains/ar/contract";
import { invoice } from "./ar-fixtures";
const query = { from: "2027-01-01", to: "2027-01-31", limit: 1 };
function page(records = [invoice()], overrides = {}) {
  return {
    contract: "pioneer-customer-invoices-v1",
    capturedAt: "2027-01-16T00:00:00.000Z",
    period: { from: query.from, to: query.to, includesUndated: true },
    sourceConsistency: "mongo-snapshot-per-request",
    records,
    pagination: {
      total: records.length,
      limit: 1,
      scanRevision: "a".repeat(64),
      nextCursor: null,
      complete: true,
    },
    ...overrides,
  };
}
beforeEach(() => {
  vi.stubEnv("PIONEER_ERP_BASE_URL", "https://erp-fixture.example");
  vi.stubEnv("FINANCIAL_AGENT_API_KEY", "fixture-only-server-key");
});
afterEach(() => vi.unstubAllEnvs());
describe("strict ERP invoice client", () => {
  it("uses only the exact GET contract, server bearer and bound cursor parameters", async () => {
    const first = page([invoice()], {
      pagination: {
        total: 2,
        limit: 1,
        scanRevision: "a".repeat(64),
        nextCursor: "opaque",
        complete: false,
      },
    });
    const second = page([invoice({ sourceId: "b".repeat(64) })], {
      pagination: { ...first.pagination, nextCursor: null, complete: true },
    });
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(first))
      .mockResolvedValueOnce(Response.json(second));
    expect((await scanInvoices(query, mock)).records).toHaveLength(2);
    const url = new URL(String(mock.mock.calls[1][0]));
    expect(url.pathname).toBe(
      "/api/integrations/financial-agent/customer-invoices",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      contract: "pioneer-customer-invoices-v1",
      ...query,
      limit: "1",
      cursor: "opaque",
    });
    expect(mock.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: "Bearer fixture-only-server-key" },
      redirect: "error",
      cache: "no-store",
    });
  });
  it("discards partial pages on 409 and restarts from the first page", async () => {
    const first = page([invoice()], {
      pagination: {
        total: 2,
        limit: 1,
        scanRevision: "a".repeat(64),
        nextCursor: "opaque",
        complete: false,
      },
    });
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(first))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(
        Response.json(page([invoice({ sourceRevision: "2".repeat(64) })])),
      );
    const result = await scanInvoices(query, mock);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].record.sourceRevision).toBe("2".repeat(64));
    expect(
      new URL(String(mock.mock.calls[2][0])).searchParams.has("cursor"),
    ).toBe(false);
  });
  it("bounded repeated scan changes remain an error, never an empty success", async () => {
    const mock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(null, { status: 409 }));
    await expect(scanInvoices(query, mock)).rejects.toMatchObject({
      status: 409,
    });
    expect(mock).toHaveBeenCalledTimes(3);
  });
  it.each([400, 401, 403, 413, 422, 503])(
    "handles ERP %s without returning partial records or upstream secrets",
    async (status) => {
      const mock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("SECRET-UPSTREAM-BODY", { status }));
      const error = await scanInvoices(query, mock).catch((e) => e);
      expect(error.status).toBe(status);
      expect(error.message).not.toContain("SECRET-UPSTREAM");
    },
  );
  it("rejects invalid envelopes, invented fields and inconsistent total/completeness", async () => {
    for (const value of [
      { ...page(), paidAmount: 5 },
      page([], {
        pagination: {
          total: 1,
          limit: 1,
          scanRevision: "a".repeat(64),
          nextCursor: null,
          complete: true,
        },
      }),
      page([], {
        pagination: {
          total: 0,
          limit: 1,
          scanRevision: "a".repeat(64),
          nextCursor: null,
          complete: false,
        },
      }),
    ]) {
      await expect(
        scanInvoices(
          query,
          vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)),
        ),
      ).rejects.toThrow();
    }
    expect(
      financialInvoicePageSchema.safeParse(
        page([invoice({ company: "other" as "pioneer" })]),
      ).success,
    ).toBe(false);
  });
  it("rejects duplicates and changed scan revision across pages", async () => {
    const first = page([invoice()], {
      pagination: {
        total: 2,
        limit: 1,
        scanRevision: "a".repeat(64),
        nextCursor: "opaque",
        complete: false,
      },
    });
    for (const revision of ["a", "b"]) {
      const next = page([invoice()], {
        pagination: {
          total: 2,
          limit: 1,
          scanRevision: revision.repeat(64),
          nextCursor: null,
          complete: true,
        },
      });
      await expect(
        scanInvoices(
          query,
          vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(Response.json(first))
            .mockResolvedValueOnce(Response.json(next)),
        ),
      ).rejects.toThrow();
    }
  });
  it("rejects unsupported range/limit, oversized scans and oversized response bodies", async () => {
    const mock = vi.fn<typeof fetch>();
    await expect(
      scanInvoices({ ...query, to: "2028-02-01" }, mock),
    ).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
    await expect(
      scanInvoices({ ...query, limit: 101 }, mock),
    ).rejects.toThrow();
    await expect(
      scanInvoices(
        query,
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            Response.json(
              page([], {
                pagination: {
                  total: 251,
                  limit: 1,
                  scanRevision: "a".repeat(64),
                  nextCursor: "x",
                  complete: false,
                },
              }),
            ),
          ),
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      scanInvoices(
        query,
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("x".repeat(2_097_153))),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("network/redirect failures reveal no secret and never count as successful scans", async () => {
    const error = await scanInvoices(
      query,
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error("fixture-only-server-key")),
    ).catch((e) => e);
    expect(error.status).toBe(503);
    expect(error.message).not.toContain("fixture-only-server-key");
  });
  it("production requires HTTPS and prohibits credential-bearing or path URLs", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const url of [
      "http://localhost:3000",
      "https://user:password@example.com",
      "https://example.com/other",
      "https://example.com/?key=secret",
    ]) {
      vi.stubEnv("PIONEER_ERP_BASE_URL", url);
      expect(() => erpConnection()).toThrow();
    }
  });
});

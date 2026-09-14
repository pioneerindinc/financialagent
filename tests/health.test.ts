import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const probe = vi.hoisted(() => ({
  constructor: vi.fn(),
  connect: vi.fn(),
  command: vi.fn(),
  close: vi.fn(),
}));
vi.mock("mongoose", () => ({
  mongo: {
    MongoClient: class {
      constructor(...args: unknown[]) {
        probe.constructor(...args);
      }
      connect = probe.connect;
      db() {
        return { command: probe.command };
      }
      close = probe.close;
    },
  },
}));
import { GET as processHealth } from "../src/app/api/health/route";
import { GET as dbHealth } from "../src/app/api/health/db/route";
const primary = {
  setName: "private-set-name",
  isWritablePrimary: true,
  logicalSessionTimeoutMinutes: 30,
  maxWireVersion: 25,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv(
    "MONGODB_URI",
    "mongodb://private-user:private-password@private-host/private-database",
  );
  probe.connect.mockResolvedValue(undefined);
  probe.close.mockResolvedValue(undefined);
  probe.command.mockImplementation(async (command: { ping?: number }) =>
    command.ping ? { ok: 1 } : primary,
  );
});
afterEach(() => vi.unstubAllEnvs());
describe("safe health probes", () => {
  it("process health has no auth, configuration or database dependency", async () => {
    vi.stubEnv("MONGODB_URI", undefined);
    const response = await processHealth();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(probe.constructor).not.toHaveBeenCalled();
  });
  it("reports only whitelisted topology readiness with read-only commands", async () => {
    const response = await dbHealth();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      environment: "production",
      transactionReady: true,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(probe.command.mock.calls.map((call) => call[0])).toEqual([
      { ping: 1 },
      { hello: 1 },
    ]);
    expect(probe.close).toHaveBeenCalledOnce();
  });
  it("fails safely with missing configuration and no connection attempt", async () => {
    vi.stubEnv("MONGODB_URI", undefined);
    const response = await dbHealth();
    expect(response.status).toBe(503);
    expect(probe.constructor).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      ok: false,
      environment: "production",
      transactionReady: false,
    });
  });
  it("does not expose failed connection details", async () => {
    probe.connect.mockRejectedValue(
      new Error(
        "private-password mongodb://private-host/private-database C:\\secret\\env",
      ),
    );
    const response = await dbHealth();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      environment: "production",
      transactionReady: false,
    });
    expect(probe.close).toHaveBeenCalledOnce();
  });
  it("fails on ping errors and still closes the client", async () => {
    probe.command.mockRejectedValue(new Error("private ping failure"));
    expect((await dbHealth()).status).toBe(503);
    expect(probe.close).toHaveBeenCalledOnce();
  });
  it.each([
    {},
    { ...primary, isWritablePrimary: false },
    { ...primary, logicalSessionTimeoutMinutes: null },
    { ...primary, maxWireVersion: 6 },
  ])(
    "does not claim transaction readiness for insufficient topology %j",
    async (hello) => {
      probe.command.mockImplementation(async (command: { ping?: number }) =>
        command.ping ? { ok: 1 } : hello,
      );
      expect((await dbHealth()).status).toBe(503);
    },
  );
  it("recognizes a transaction-capable mongos router", async () => {
    probe.command.mockImplementation(async (command: { ping?: number }) =>
      command.ping
        ? { ok: 1 }
        : {
            msg: "isdbgrid",
            maxWireVersion: 25,
            logicalSessionTimeoutMinutes: 30,
          },
    );
    expect((await dbHealth()).status).toBe(200);
  });
  it("normalizes unrecognized environment labels", async () => {
    vi.stubEnv("NODE_ENV", "private-deployment-name");
    expect((await (await dbHealth()).json()).environment).toBe("unknown");
  });
});

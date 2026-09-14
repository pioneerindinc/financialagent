import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  developmentConfig,
  allowDevelopmentRequest,
  DEV_MONGODB_URI,
  DEV_ORIGIN,
  DEV_COOKIE,
  DEV_OPERATOR,
} from "../src/lib/development/config";
import {
  issueDevelopmentSession,
  developmentSession,
} from "../src/lib/auth/development";
import {
  requestHumanSession,
  assertMutationOrigin,
} from "../src/lib/auth/request";
import * as pioneer from "../src/lib/auth/session";
import { authorize } from "../src/lib/auth/policy";
import { POST } from "../src/app/dev/session/route";
import { NextRequest } from "next/server";
const secret = "ab".repeat(32);
const requestHeaders = () =>
  new Headers({ host: "127.0.0.1:3445", origin: DEV_ORIGIN });
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DEV_AUTH_ENABLED", "true");
  vi.stubEnv("DEV_AUTH_SECRET", secret);
  vi.stubEnv("DEV_AUTH_LOCAL_LAUNCH", "loopback-only");
  vi.stubEnv("APP_BASE_URL", DEV_ORIGIN);
  vi.stubEnv("MONGODB_URI", DEV_MONGODB_URI);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("development identity safety gates", () => {
  it("is disabled by default", () => {
    vi.stubEnv("DEV_AUTH_ENABLED", undefined);
    expect(() => developmentConfig()).toThrow();
  });
  it("fails closed in production even with all flags configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => developmentConfig()).toThrow();
  });
  it("rejects test mode and other non-development runtimes", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(() => developmentConfig()).toThrow();
  });
  it.each(["DEV_AUTH_SECRET", "APP_BASE_URL", "MONGODB_URI"])(
    "rejects missing %s",
    (key) => {
      vi.stubEnv(key, undefined);
      expect(() => developmentConfig()).toThrow();
    },
  );
  it("requires the local-only launcher", () => {
    vi.stubEnv("DEV_AUTH_LOCAL_LAUNCH", undefined);
    expect(() => allowDevelopmentRequest(requestHeaders())).toThrow();
  });
  it.each([
    "mongodb://remote.example/financialagent_dev",
    "mongodb://127.0.0.1:27291/pioneer",
    "mongodb://127.0.0.1:27291/financialagent_test",
    "mongodb+srv://example/financialagent_dev",
  ])("rejects unsafe database %s without connection", (uri) => {
    vi.stubEnv("MONGODB_URI", uri);
    expect(() => developmentConfig()).toThrow();
  });
  it("rejects remote request hostname", () => {
    const h = requestHeaders();
    h.set("host", "evil.example");
    expect(() => allowDevelopmentRequest(h)).toThrow();
  });
  it("rejects another localhost origin", () => {
    const h = requestHeaders();
    h.set("origin", "https://localhost:3445");
    expect(() => allowDevelopmentRequest(h, true)).toThrow("origin");
  });
  it("rejects missing mutation origin", () => {
    const h = requestHeaders();
    h.delete("origin");
    expect(() => allowDevelopmentRequest(h, true)).toThrow("origin");
  });
  it("rejects nonlocal forwarded peers", () => {
    const h = requestHeaders();
    h.set("x-forwarded-for", "192.168.1.10");
    expect(() => allowDevelopmentRequest(h)).toThrow();
  });
  it("allows only Next loopback forwarding metadata", () => {
    const h = requestHeaders();
    h.set("x-forwarded-for", "127.0.0.1");
    h.set("x-forwarded-host", "127.0.0.1:3445");
    h.set("x-forwarded-proto", "https");
    expect(() => allowDevelopmentRequest(h)).not.toThrow();
  });
  it("requires strong local secret configuration", () => {
    vi.stubEnv("DEV_AUTH_SECRET", "password");
    expect(() => developmentConfig()).toThrow();
  });
  it("issues and verifies a real signed expiring session under normal policy", async () => {
    const token = await issueDevelopmentSession(requestHeaders());
    const actor = await developmentSession(token, requestHeaders());
    expect(actor.id).toBe("dev:local-finance");
    expect(actor.companies).toHaveLength(4);
    expect(() =>
      authorize(actor, "pioneer-industries", "finance:write"),
    ).not.toThrow();
    expect(() => authorize(actor, "foreign-company")).toThrow();
  });
  it("rejects tampered signatures", async () => {
    const token = await issueDevelopmentSession(requestHeaders());
    await expect(
      developmentSession(`${token.slice(0, -10)}XXXXXXXXXX`, requestHeaders()),
    ).rejects.toThrow();
  });
  it("rejects expired dev sessions", async () => {
    const token = await new SignJWT({ development: true })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(DEV_OPERATOR.id)
      .setIssuer(DEV_ORIGIN)
      .setAudience("financialagent-local-development")
      .setIssuedAt()
      .setExpirationTime(1)
      .sign(Buffer.from(secret, "hex"));
    await expect(developmentSession(token, requestHeaders())).rejects.toThrow();
  });
  it("does not accept dev cookie in production", async () => {
    const token = await issueDevelopmentSession(requestHeaders());
    vi.stubEnv("NODE_ENV", "production");
    await expect(
      requestHumanSession(
        { get: (name) => (name === DEV_COOKIE ? { value: token } : undefined) },
        requestHeaders(),
      ),
    ).rejects.toThrow("Authentication required");
  });
  it("retains Pioneer verification precedence with no dev fallback", async () => {
    const verify = vi
      .spyOn(pioneer, "humanSession")
      .mockRejectedValue(new Error("Pioneer denied"));
    await expect(
      requestHumanSession(
        { get: () => ({ value: "provided-token" }) },
        requestHeaders(),
      ),
    ).rejects.toThrow("Pioneer denied");
    expect(verify).toHaveBeenCalledWith("provided-token");
  });
  it("retains Origin checks for development writes", () => {
    const h = requestHeaders();
    h.set("origin", "https://evil.example");
    expect(() => assertMutationOrigin(DEV_OPERATOR, h)).toThrow("origin");
  });
  it("retains Pioneer mutation origin validation", () => {
    vi.stubEnv("AUTH_ISSUER", "https://pioneer.example");
    vi.stubEnv("AUTH_AUDIENCE", "finance");
    vi.stubEnv("AUTH_JWKS_URL", "https://pioneer.example/jwks");
    expect(() =>
      assertMutationOrigin(
        { id: "human", kind: "human", companies: [], scopes: [] },
        new Headers({ origin: "https://evil.example" }),
      ),
    ).toThrow("origin");
  });
  it("hides dev issuance endpoint when disabled", async () => {
    vi.stubEnv("DEV_AUTH_ENABLED", "false");
    const res = await POST(
      new NextRequest(`${DEV_ORIGIN}/dev/session`, {
        method: "POST",
        headers: requestHeaders(),
      }),
    );
    expect(res.status).toBe(404);
  });
  it("hides dev issuance endpoint in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(
      new NextRequest(`${DEV_ORIGIN}/dev/session`, {
        method: "POST",
        headers: requestHeaders(),
      }),
    );
    expect(res.status).toBe(404);
  });
  it("rejects cross-origin issuance", async () => {
    const headers = requestHeaders();
    headers.set("origin", "https://evil.example");
    const res = await POST(
      new NextRequest(`${DEV_ORIGIN}/dev/session`, { method: "POST", headers }),
    );
    expect(res.status).toBe(403);
  });
  it("sets a separate Secure HttpOnly SameSite cookie", async () => {
    const headers = requestHeaders();
    headers.set("content-type", "application/x-www-form-urlencoded");
    const res = await POST(
      new NextRequest(`${DEV_ORIGIN}/dev/session`, {
        method: "POST",
        headers,
        body: "",
      }),
    );
    expect(res.status).toBe(303);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain(DEV_COOKIE);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=strict");
    expect(cookie).toContain("Max-Age=3600");
    expect(cookie).not.toContain("Domain=");
  });
});

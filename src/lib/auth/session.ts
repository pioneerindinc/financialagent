import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { authConfig } from "../config";
import { DomainError } from "../errors";
import type { Actor } from "./policy";
import { authMode } from "./internal-config";
import { internalSession } from "./internal";
const claims = z.object({
  sub: z.string().min(1),
  companies: z.array(z.string()),
  scopes: z.array(z.enum(["finance:read", "finance:write"])),
});
let jwks: ReturnType<typeof createRemoteJWKSet>;
export async function humanSession(token?: string): Promise<Actor> {
  if (!token) throw new DomainError("Authentication required", 401);
  try {
    if (authMode() === "internal") return await internalSession(token);
    const config = authConfig();
    jwks ??= createRemoteJWKSet(new URL(config.AUTH_JWKS_URL));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.AUTH_ISSUER,
      audience: config.AUTH_AUDIENCE,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "sub"],
      maxTokenAge: "1h",
    });
    const c = claims.parse(payload);
    return {
      id: c.sub,
      kind: "human",
      companies: c.companies,
      scopes: c.scopes,
    };
  } catch {
    throw new DomainError("Invalid or expired session", 401);
  }
}
const credentials = z.array(
  z.object({
    id: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    companies: z.array(z.string()).min(1),
    scopes: z.array(
      z.enum([
        "finance:source:write",
        "finance:read",
        "ar:read",
        "ap:read",
        "cfo:read",
      ]),
    ),
    expiresAt: z.iso.datetime(),
  }),
);
export function serviceSession(token: string): Actor {
  const hash = createHash("sha256").update(token).digest();
  const list = credentials.parse(
    JSON.parse(process.env.SERVICE_CREDENTIALS_JSON || "[]"),
  );
  const found = list.find(
    (c) =>
      timingSafeEqual(hash, Buffer.from(c.sha256, "hex")) &&
      Date.parse(c.expiresAt) > Date.now(),
  );
  if (!found || token.length < 32)
    throw new DomainError("Invalid service credential", 401);
  return {
    id: found.id,
    kind: "service",
    companies: found.companies,
    scopes: found.scopes,
  };
}

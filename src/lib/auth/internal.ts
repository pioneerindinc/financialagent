import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { internalConfig, SESSION_SECONDS } from "./internal-config";
import { authStore, userInput } from "./internal-store";
import { verifyPassword } from "./password";
import { DomainError } from "../errors";
import type { Actor } from "./policy";

const audience = "finance-internal-session";
const invalid = () => new DomainError("Invalid or expired session", 401);

async function sessionClaims(token: string) {
  const config = internalConfig();
  const { payload } = await jwtVerify(token, config.key, {
    issuer: config.origin,
    audience,
    algorithms: ["HS256"],
    requiredClaims: ["exp", "iat", "sub", "jti"],
    maxTokenAge: "1h",
  });
  if (!payload.sub || !payload.jti) throw invalid();
  return payload;
}

export async function internalSession(token: string): Promise<Actor> {
  try {
    const claims = await sessionClaims(token);
    const store = await authStore();
    const session = await store.sessions.findOne({
      _id: claims.jti!,
      userId: claims.sub!,
      expiresAt: { $gt: new Date() },
    });
    if (!session) throw invalid();
    const user = await store.users.findOne({
      _id: session.userId,
      version: session.version,
      disabled: false,
    });
    if (!user) throw invalid();
    const assignment = userInput.parse(user);
    return {
      id: user._id,
      kind: "human",
      companies: assignment.companies,
      scopes:
        assignment.role === "viewer"
          ? ["finance:read"]
          : ["finance:read", "finance:write"],
    };
  } catch {
    throw invalid();
  }
}

// Persistent limits shared by releases/processes. Never trust client-supplied proxy IP headers.
async function limitLogin(username: string) {
  const { attempts } = await authStore();
  const window = Math.floor(Date.now() / 900000);
  const userKey = createHash("sha256").update(username).digest("hex");
  for (const [key, maximum] of [
    ["global", 60],
    [userKey, 10],
  ] as const) {
    const result = await attempts.findOneAndUpdate(
      { _id: `${window}:${key}` },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((window + 2) * 900000) },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result || result.count > maximum)
      throw new DomainError(
        "Sign-in temporarily unavailable. Try again later.",
        429,
      );
  }
}

let hashing = false;
export async function login(
  username: string,
  password: string,
): Promise<string> {
  const config = internalConfig();
  const normalized = userInput.shape.username.safeParse(username);
  if (!normalized.success || Buffer.byteLength(password, "utf8") > 256)
    throw new DomainError("Invalid username or password", 401);
  await limitLogin(normalized.data);
  // Bound scrypt memory per Node process; no unbounded queue of expensive work.
  if (hashing)
    throw new DomainError(
      "Sign-in temporarily unavailable. Try again later.",
      429,
    );
  hashing = true;
  try {
    const store = await authStore();
    const user = await store.users.findOne({ username: normalized.data });
    const valid = await verifyPassword(password, user?.passwordHash);
    if (!valid || !user || user.disabled)
      throw new DomainError("Invalid username or password", 401);
    userInput.parse(user);
    const id = randomUUID();
    const issued = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(config.origin)
      .setAudience(audience)
      .setSubject(user._id)
      .setJti(id)
      .setIssuedAt(issued)
      .setExpirationTime(issued + SESSION_SECONDS)
      .sign(config.key);
    await store.sessions.insertOne({
      _id: id,
      userId: user._id,
      version: user.version,
      expiresAt: new Date((issued + SESSION_SECONDS) * 1000),
    });
    return token;
  } finally {
    hashing = false;
  }
}

export async function logout(token?: string) {
  internalConfig();
  if (!token) return;
  // Expired/tampered tokens are already unusable. Database failure must not claim revocation.
  const claims = await sessionClaims(token).catch(() => null);
  if (!claims) return;
  const { sessions } = await authStore();
  await sessions.deleteOne({ _id: claims.jti!, userId: claims.sub! });
}

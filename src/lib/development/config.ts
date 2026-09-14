import { assert } from "../errors";
export const DEV_ORIGIN = "https://127.0.0.1:3445";
export const DEV_DATABASE = "financialagent_dev";
export const DEV_REPLICA_SET = "financialagent-dev";
export const DEV_MONGO_PORT = 27291;
export const DEV_MONGODB_URI = `mongodb://127.0.0.1:${DEV_MONGO_PORT}/${DEV_DATABASE}?replicaSet=${DEV_REPLICA_SET}&directConnection=true`;
export const DEV_COOKIE = "__Host-finance-development";
export const DEV_OPERATOR = {
  id: "dev:local-finance",
  kind: "human" as const,
  companies: [
    "pioneer-industries",
    "317-graphics",
    "headquarters-on-main",
    "fish-properties",
  ],
  scopes: ["finance:read", "finance:write"],
  session: "development" as const,
};
export function assertDevDatabaseUri(uri: string | undefined) {
  assert(
    uri === DEV_MONGODB_URI,
    `Local development requires the dedicated ${DEV_DATABASE} replica-set URI. No connection attempted.`,
  );
}
export function developmentConfig(env: NodeJS.ProcessEnv = process.env) {
  assert(
    env.NODE_ENV === "development" && env.DEV_AUTH_ENABLED === "true",
    "Development sign-in is unavailable",
    404,
  );
  assert(
    env.APP_BASE_URL === DEV_ORIGIN,
    "Development sign-in requires the exact loopback HTTPS origin",
    404,
  );
  assertDevDatabaseUri(env.MONGODB_URI);
  assert(
    /^[a-f0-9]{64}$/.test(env.DEV_AUTH_SECRET || ""),
    "Run npm run dev:setup to configure a local development signing secret",
    404,
  );
  return { secret: env.DEV_AUTH_SECRET!, origin: DEV_ORIGIN };
}
export function allowDevelopmentRequest(
  headers: Headers,
  mutation = false,
  env: NodeJS.ProcessEnv = process.env,
) {
  const config = developmentConfig(env);
  assert(
    env.DEV_AUTH_LOCAL_LAUNCH === "loopback-only",
    "Start the local-only server with npm run dev",
    404,
  );
  assert(
    headers.get("host") === "127.0.0.1:3445",
    "Development sign-in requires the exact loopback host",
    404,
  );
  // Do not trust forwarded headers as evidence of locality.
  assert(
    !headers.has("forwarded"),
    "Forwarded development sessions are not allowed",
    404,
  );
  if (headers.has("x-forwarded-for"))
    assert(
      headers.get("x-forwarded-for") === "127.0.0.1",
      "Remote development sessions are not allowed",
      404,
    );
  if (headers.has("x-forwarded-host"))
    assert(
      headers.get("x-forwarded-host") === "127.0.0.1:3445",
      "Invalid forwarded host",
      404,
    );
  if (headers.has("x-forwarded-proto"))
    assert(headers.get("x-forwarded-proto") === "https", "HTTPS required", 404);
  if (mutation)
    assert(
      headers.get("origin") === config.origin,
      "Invalid request origin",
      403,
    );
  return config;
}

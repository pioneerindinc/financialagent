import { z } from "zod";
import { assertDevDatabaseUri } from "./development/config";
export function databaseConfig() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_ENABLED === "true"
  )
    assertDevDatabaseUri(process.env.MONGODB_URI);
  return z
    .object({ MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//) })
    .parse(process.env);
}
export function authConfig() {
  return z
    .object({
      APP_BASE_URL: z.url(),
      AUTH_ISSUER: z.url(),
      AUTH_AUDIENCE: z.string().min(1),
      AUTH_JWKS_URL: z.url().startsWith("https://"),
    })
    .parse(process.env);
}

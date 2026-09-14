import { z } from "zod";

export function authMode() {
  return z
    .enum(["external", "internal"])
    .parse(process.env.AUTH_MODE || "external");
}

export function applicationOrigin() {
  const url = new URL(z.url().parse(process.env.APP_BASE_URL));
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.href !== `${url.origin}/`
  )
    throw new Error("APP_BASE_URL must be a canonical HTTPS origin");
  return url.origin;
}

export function internalConfig() {
  if (authMode() !== "internal")
    throw new Error("Internal authentication unavailable");
  const secret = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(process.env.AUTH_SESSION_SECRET);
  return { origin: applicationOrigin(), key: Buffer.from(secret, "hex") };
}

export const SESSION_COOKIE = "__Host-finance-session";
export const SESSION_SECONDS = 3600;

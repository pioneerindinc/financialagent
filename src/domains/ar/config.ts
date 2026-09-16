import "server-only";
import { assert } from "../../lib/errors";

export function arCompany() {
  const company = process.env.PIONEER_AR_COMPANY_ID;
  assert(
    company && /^[a-z0-9-]{1,100}$/.test(company),
    "Pioneer AR company binding is not configured",
    503,
  );
  return company;
}
export function authoritativeEnabled() {
  return process.env.PIONEER_AR_AUTHORITATIVE_ENABLED === "true";
}
export function erpConnection() {
  let url: URL;
  try {
    url = new URL(process.env.PIONEER_ERP_BASE_URL || "");
  } catch {
    throw new Error("ERP base URL is not configured");
  }
  assert(
    !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    "ERP base URL must be an origin",
    503,
  );
  assert(
    url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)),
    "ERP requires HTTPS (development loopback HTTP only)",
    503,
  );
  const key = process.env.FINANCIAL_AGENT_API_KEY;
  assert(
    key && key.trim() === key && !/[\r\n]/.test(key),
    "ERP credential is not configured",
    503,
  );
  return { origin: url.origin, key };
}

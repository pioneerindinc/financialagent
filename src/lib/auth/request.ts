import "server-only";
import { humanSession } from "./session";
import { developmentSession } from "./development";
import { allowDevelopmentRequest, DEV_COOKIE } from "../development/config";
import { applicationOrigin } from "./internal-config";
import { assert } from "../errors";
import type { Actor } from "./policy";
type CookieReader = { get(name: string): { value: string } | undefined };
export async function requestHumanSession(
  cookies: CookieReader,
  headers: Headers,
): Promise<Actor> {
  const pioneer = cookies.get("__Host-finance-session")?.value;
  // Existing Pioneer sessions keep precedence; failures never fall back to dev identity.
  if (pioneer) return humanSession(pioneer);
  const dev = cookies.get(DEV_COOKIE)?.value;
  if (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_ENABLED === "true" &&
    dev
  )
    return developmentSession(dev, headers);
  return humanSession();
}
export function assertMutationOrigin(actor: Actor, headers: Headers) {
  if (actor.kind !== "human") return;
  if (actor.session === "development") {
    allowDevelopmentRequest(headers, true);
    return;
  }
  assert(
    headers.get("origin") === applicationOrigin(),
    "Invalid request origin",
    403,
  );
}

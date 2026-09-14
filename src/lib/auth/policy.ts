import { assert } from "../errors";
export type Actor = {
  id: string;
  kind: "human" | "service";
  companies: string[];
  scopes: string[];
  session?: "development";
};
export function authorize(
  actor: Actor,
  company: string,
  scope = "finance:read",
) {
  assert(
    actor.id && actor.companies.includes(company),
    "Company access denied",
    403,
  );
  assert(actor.scopes.includes(scope), "Permission denied", 403);
  if (scope === "finance:write")
    assert(actor.kind === "human", "Human authorization required", 403);
}

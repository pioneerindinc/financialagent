import { NextRequest } from "next/server";
import { z } from "zod";
import {
  requestHumanSession,
  assertMutationOrigin,
} from "../../../lib/auth/request";
import { serviceSession } from "../../../lib/auth/session";
import { assert, DomainError } from "../../../lib/errors";
import {
  arOverview,
  ingestionMode,
  makeInvoiceDraft,
  saveMapping,
  syncInvoices,
} from "../../../domains/ar/service";
import { id, text } from "../../../domains/accounting/validation";
import { scanQuery } from "../../../domains/ar/client";
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("sync"),
      companyId: id,
      query: scanQuery,
      mode: ingestionMode,
      reason: text,
    })
    .strict(),
  z
    .object({
      action: z.literal("mapping"),
      companyId: id,
      data: z.unknown(),
      version: z.number().int().nonnegative(),
      reason: text,
    })
    .strict(),
  z
    .object({
      action: z.literal("draft"),
      companyId: id,
      versionId: id,
      reason: text,
    })
    .strict(),
]);
async function actor(req: NextRequest) {
  const bearer = req.headers.get("authorization");
  return bearer
    ? serviceSession(bearer.replace(/^Bearer /, ""))
    : requestHumanSession(req.cookies, req.headers);
}
function failure(error: unknown) {
  if (error instanceof DomainError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return Response.json(
      { error: "Invalid AR request or configuration" },
      { status: 400 },
    );
  return Response.json(
    {
      error: "Unable to complete AR operation; no partial import is successful",
    },
    { status: 500 },
  );
}
export async function GET(req: NextRequest) {
  try {
    const user = await actor(req);
    const params = req.nextUrl.searchParams;
    return Response.json(
      await arOverview(
        user,
        id.parse(params.get("company")),
        params.get("cursor") || undefined,
        params.get("invoice") || undefined,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const user = await actor(req);
    assertMutationOrigin(user, req.headers);
    assert(
      req.headers.get("content-type")?.includes("application/json"),
      "JSON required",
      415,
    );
    const body = await req.text();
    assert(Buffer.byteLength(body) <= 256_000, "Request too large", 413);
    const c = command.parse(JSON.parse(body));
    let result;
    if (c.action === "sync")
      result = await syncInvoices(user, c.companyId, c.query, c.mode, c.reason);
    else if (c.action === "mapping")
      result = await saveMapping(
        user,
        c.companyId,
        c.data,
        c.version,
        c.reason,
      );
    else
      result = await makeInvoiceDraft(user, c.companyId, c.versionId, c.reason);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { serviceSession } from "../../../lib/auth/session";
import {
  requestHumanSession,
  assertMutationOrigin,
} from "../../../lib/auth/request";
import { DomainError, assert } from "../../../lib/errors";
import {
  createAccount,
  editAccount,
  createDraft,
  createPeriod,
  closePeriod,
  editDraft,
  postJournal,
  reverseJournal,
} from "../../../domains/accounting/service";
import {
  overview,
  trialBalance,
  generalLedger,
} from "../../../domains/reporting/service";
import { getJournal } from "../../../domains/accounting/queries";
import { id, text, date } from "../../../domains/accounting/validation";
async function actor(req: NextRequest) {
  const bearer = req.headers.get("authorization");
  return bearer
    ? serviceSession(bearer.replace(/^Bearer /, ""))
    : requestHumanSession(req.cookies, req.headers);
}
function errorResponse(error: unknown) {
  if (error instanceof DomainError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError)
    return Response.json(
      {
        error: "Invalid request",
        issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === 11000
  )
    return Response.json({ error: "Record already exists" }, { status: 409 });
  console.error(
    "Finance request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return Response.json(
    { error: "Unable to complete request" },
    { status: 500 },
  );
}
export async function GET(req: NextRequest) {
  try {
    const user = await actor(req);
    const q = req.nextUrl.searchParams;
    const company = id.parse(q.get("company"));
    let data;
    switch (q.get("view")) {
      case "trial-balance":
        data = await trialBalance(user, company, date.parse(q.get("asOf")));
        break;
      case "general-ledger":
        data = await generalLedger(
          user,
          company,
          date.parse(q.get("from")),
          date.parse(q.get("to")),
          q.get("account") || undefined,
        );
        break;
      case "journal":
        data = await getJournal(user, company, id.parse(q.get("id")));
        break;
      default:
        data = await overview(user, company);
    }
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
const command = z
  .object({
    companyId: id,
    action: z.enum([
      "account.create",
      "account.edit",
      "period.create",
      "period.close",
      "journal.create",
      "journal.edit",
      "journal.post",
      "journal.reverse",
    ]),
    id: id.optional(),
    data: z.unknown().optional(),
    revision: z.number().int().nonnegative().optional(),
    date: date.optional(),
    reason: text.optional(),
  })
  .strict();
export async function POST(req: NextRequest) {
  try {
    const user = await actor(req);
    assertMutationOrigin(user, req.headers);
    assert(
      req.headers.get("content-type")?.includes("application/json"),
      "JSON required",
      415,
    );
    const raw = await req.text();
    assert(Buffer.byteLength(raw) <= 256_000, "Request too large", 413);
    const c = command.parse(JSON.parse(raw));
    let result;
    switch (c.action) {
      case "account.create":
        result = await createAccount(user, c.companyId, c.data);
        break;
      case "account.edit":
        result = await editAccount(
          user,
          c.companyId,
          id.parse(c.id),
          c.data,
          z.number().int().nonnegative().parse(c.revision),
          text.parse(c.reason),
        );
        break;
      case "period.create":
        result = await createPeriod(user, c.companyId, c.data);
        break;
      case "period.close":
        result = await closePeriod(
          user,
          c.companyId,
          id.parse(c.id),
          text.parse(c.reason),
        );
        break;
      case "journal.create":
        result = await createDraft(user, c.companyId, c.data);
        break;
      case "journal.edit":
        result = await editDraft(
          user,
          c.companyId,
          id.parse(c.id),
          c.data,
          z.number().int().nonnegative().parse(c.revision),
        );
        break;
      case "journal.post":
        result = await postJournal(
          user,
          c.companyId,
          id.parse(c.id),
          z.number().int().nonnegative().parse(c.revision),
        );
        break;
      case "journal.reverse":
        result = await reverseJournal(
          user,
          c.companyId,
          id.parse(c.id),
          date.parse(c.date),
          text.parse(c.reason),
        );
        break;
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

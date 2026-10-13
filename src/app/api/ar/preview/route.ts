import { NextRequest } from "next/server";
import { z } from "zod";
import { previewInvoices } from "../../../../domains/ar/preview";
import { requestHumanSession } from "../../../../lib/auth/request";
import { assert, DomainError } from "../../../../lib/errors";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const parameters = z
  .object({
    company: z.string().min(1).max(100),
    from: z.iso.date(),
    to: z.iso.date(),
    limit: z
      .string()
      .regex(/^[1-9]\d{0,2}$/)
      .transform(Number)
      .default(50),
  })
  .strict();

export async function GET(req: NextRequest) {
  try {
    // No service bearer fallback: this endpoint is for authenticated humans.
    const actor = await requestHumanSession(req.cookies, req.headers);
    const params = req.nextUrl.searchParams;
    assert(
      [...params.keys()].every((key) => params.getAll(key).length === 1),
      "Duplicate preview parameters",
      400,
    );
    const { company, ...query } = parameters.parse(Object.fromEntries(params));
    return Response.json(await previewInvoices(actor, company, query), {
      headers,
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error:
            "Invalid preview query. Use valid dates, an inclusive window of at most 366 days, and a maximum of 1–100 invoices.",
        },
        { status: 400, headers },
      );
    if (error instanceof DomainError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    return Response.json(
      { error: "Unable to retrieve ERP preview. No partial preview is shown." },
      { status: 503, headers },
    );
  }
}

// Next would otherwise implement HEAD by invoking GET (and scanning the ERP).
export function HEAD() {
  return new Response(null, {
    status: 405,
    headers: { ...headers, Allow: "GET" },
  });
}
export const OPTIONS = HEAD;
// Next returns 405 for unimplemented mutation methods.

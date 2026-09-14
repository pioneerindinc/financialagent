import { databaseHealth } from "../../../../lib/health/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await databaseHealth();
  return Response.json(result, {
    status: result.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

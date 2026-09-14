import { NextRequest } from "next/server";
import { logout } from "../../../lib/auth/internal";
import { authMode, SESSION_COOKIE } from "../../../lib/auth/internal-config";
import {
  authError,
  internalMutation,
  sessionRedirect,
} from "../../../lib/auth/http";
import { DomainError } from "../../../lib/errors";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    if (authMode() !== "internal") throw new DomainError("Not found", 404);
    const origin = internalMutation(request);
    await logout(request.cookies.get(SESSION_COOKIE)?.value);
    return sessionRedirect(origin);
  } catch (error) {
    return authError(error);
  }
}

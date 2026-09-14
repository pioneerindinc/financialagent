import { NextRequest, NextResponse } from "next/server";
import { login, logout } from "../../../lib/auth/internal";
import { authMode, SESSION_COOKIE } from "../../../lib/auth/internal-config";
import {
  authError,
  internalMutation,
  loginForm,
  sessionRedirect,
} from "../../../lib/auth/http";
import { requestHumanSession } from "../../../lib/auth/request";
import { DomainError } from "../../../lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actor = await requestHumanSession(request.cookies, request.headers);
    return NextResponse.json(
      { id: actor.id, companies: actor.companies, scopes: actor.scopes },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (authMode() !== "internal") throw new DomainError("Not found", 404);
    const origin = internalMutation(request);
    const { username, password } = await loginForm(request);
    const token = await login(username, password);
    // Rotate the current browser session as well as the signed credential.
    try {
      await logout(request.cookies.get(SESSION_COOKIE)?.value);
    } catch (error) {
      await logout(token);
      throw error;
    }
    return sessionRedirect(origin, token);
  } catch (error) {
    if (error instanceof DomainError && error.status === 401) {
      const response = NextResponse.redirect(
        new URL("/sign-in?error=credentials", internalMutation(request)),
        303,
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    return authError(error);
  }
}

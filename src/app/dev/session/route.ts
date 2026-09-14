import { NextRequest, NextResponse } from "next/server";
import {
  allowDevelopmentRequest,
  DEV_COOKIE,
  DEV_ORIGIN,
} from "../../../lib/development/config";
import { issueDevelopmentSession } from "../../../lib/auth/development";
import { DomainError } from "../../../lib/errors";
export async function POST(request: NextRequest) {
  try {
    allowDevelopmentRequest(request.headers, true);
    const form = await request.formData();
    const logout = form.get("action") === "logout";
    const response = NextResponse.redirect(
      new URL(logout ? "/dev/sign-in" : "/companies", DEV_ORIGIN),
      303,
    );
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(
      DEV_COOKIE,
      logout ? "" : await issueDevelopmentSession(request.headers),
      {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: logout ? 0 : 3600,
      },
    );
    return response;
  } catch (error) {
    return new NextResponse(
      error instanceof DomainError && error.status === 403
        ? "Invalid request origin"
        : "Not found",
      {
        status:
          error instanceof DomainError && error.status === 403 ? 403 : 404,
      },
    );
  }
}

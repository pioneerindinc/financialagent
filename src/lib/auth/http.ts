import "server-only";
import { NextResponse } from "next/server";
import {
  internalConfig,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "./internal-config";
import { DomainError } from "../errors";

export function internalMutation(request: Request) {
  const { origin } = internalConfig();
  if (request.headers.get("origin") !== origin)
    throw new DomainError("Invalid request origin", 403);
  return origin;
}

export async function loginForm(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0] !==
    "application/x-www-form-urlencoded"
  )
    throw new DomainError("Unsupported content type", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError("Invalid sign-in request", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new DomainError("Sign-in request too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  if (
    form.getAll("username").length !== 1 ||
    form.getAll("password").length !== 1
  )
    throw new DomainError("Invalid sign-in request", 400);
  return { username: form.get("username")!, password: form.get("password")! };
}

export function sessionRedirect(origin: string, token?: string) {
  const response = NextResponse.redirect(
    new URL(token ? "/companies" : "/sign-in", origin),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(SESSION_COOKIE, token ?? "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: token ? SESSION_SECONDS : 0,
  });
  return response;
}

export function authError(error: unknown) {
  const status = error instanceof DomainError ? error.status : 503;
  return NextResponse.json(
    {
      error:
        status === 503
          ? "Authentication unavailable"
          : (error as DomainError).message,
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        ...(status === 429 ? { "Retry-After": "900" } : {}),
      },
    },
  );
}

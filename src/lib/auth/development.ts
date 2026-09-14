import "server-only";
import { SignJWT, jwtVerify } from "jose";
import {
  allowDevelopmentRequest,
  DEV_OPERATOR,
  DEV_ORIGIN,
} from "../development/config";
import { DomainError } from "../errors";
const audience = "financialagent-local-development";
export async function issueDevelopmentSession(headers: Headers) {
  const config = allowDevelopmentRequest(headers, true);
  return new SignJWT({ development: true })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(DEV_OPERATOR.id)
    .setIssuer(DEV_ORIGIN)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(Buffer.from(config.secret, "hex"));
}
export async function developmentSession(token: string, headers: Headers) {
  try {
    const config = allowDevelopmentRequest(headers);
    const { payload } = await jwtVerify(
      token,
      Buffer.from(config.secret, "hex"),
      {
        algorithms: ["HS256"],
        issuer: DEV_ORIGIN,
        audience,
        subject: DEV_OPERATOR.id,
        requiredClaims: ["exp", "iat", "sub"],
        maxTokenAge: "1h",
      },
    );
    if (payload.development !== true) throw new Error("Wrong session kind");
    // Assignment is fixed server-side; cookie/client claims cannot add privileges.
    return {
      ...DEV_OPERATOR,
      companies: [...DEV_OPERATOR.companies],
      scopes: [...DEV_OPERATOR.scopes],
    };
  } catch {
    throw new DomainError("Invalid or unavailable development session", 401);
  }
}

// Node-only utility shared with the explicit operator CLI. Never import from client code.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export function validatePassword(password: string) {
  if (password.length < 15 || Buffer.byteLength(password, "utf8") > 256)
    throw new Error(
      "Password must contain at least 15 characters and at most 256 UTF-8 bytes",
    );
}

export async function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(32).toString("hex");
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

// Same work for unknown users; this value can never authenticate a stored user.
const dummyHash = `scrypt-v1$${"0".repeat(64)}$${"0".repeat(128)}`;
export async function verifyPassword(password: string, encoded = dummyHash) {
  if (Buffer.byteLength(password, "utf8") > 256) return false;
  const match = /^scrypt-v1\$([a-f0-9]{64})\$([a-f0-9]{128})$/.exec(encoded);
  const [, salt, expected] =
    match ?? /^scrypt-v1\$([a-f0-9]{64})\$([a-f0-9]{128})$/.exec(dummyHash)!;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) && !!match;
}

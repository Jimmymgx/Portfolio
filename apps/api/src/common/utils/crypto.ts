import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { argon2Verify, argon2id } from "hash-wasm";
import { env } from "../../config/env.js";

/**
 * Password hashing uses argon2id through WebAssembly (hash-wasm), so no native addon is required.
 * Parameters follow the OWASP minimum for argon2id: 19 MiB memory, 2 iterations, 1 lane. We use 64 MiB and 3 iterations.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 3,
    memorySize: 64 * 1024,
    hashLength: 32,
    outputType: "encoded",
  });
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: encoded });
  } catch {
    return false;
  }
}

export const sha256 = (input: string) => createHash("sha256").update(input).digest("hex");
export const sha256Bytes = (input: Buffer) => createHash("sha256").update(input).digest("hex");

/** Random URL-safe token, `bytes` of entropy. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function hmac(input: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(input).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export const hashIp = (ip: string) => sha256(`${env.IP_HASH_SALT}:${ip}`);

/** Short-lived signed token (for draft previews). Format: base64url(payload).signature */
export function signToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${body}.${hmac(`token:${body}`)}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string): (T & { exp: number }) | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(`token:${body}`))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
    return data.exp > Math.floor(Date.now() / 1000) ? data : null;
  } catch {
    return null;
  }
}

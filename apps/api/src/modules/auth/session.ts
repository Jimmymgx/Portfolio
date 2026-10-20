import type { CookieOptions, Response } from "express";
import { prisma } from "../../config/database.js";
import { env, isProduction } from "../../config/env.js";
import { randomToken, sha256 } from "../../common/utils/crypto.js";

export const SESSION_COOKIE = "pf_session";

export const sessionTtlMs = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

export function sessionCookieOptions(maxAgeMs = sessionTtlMs): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(res: Response) {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}

/** Creates a session and returns the raw token. Only the SHA-256 of the token is stored. */
export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + sessionTtlMs);
  await prisma.adminSession.create({
    data: { userId, tokenHash: sha256(token), userAgent: userAgent?.slice(0, 255) ?? null, expiresAt, lastUsedAt: new Date() },
  });
  return { token, expiresAt };
}

export async function revokeSession(sessionId: string) {
  await prisma.adminSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Revokes every active session of a user, optionally keeping one. */
export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await prisma.adminSession.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}

/** Removes sessions that expired or were revoked more than a week ago. Safe to run at any time. */
export async function purgeOldSessions() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.adminSession.deleteMany({ where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] } });
}

import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { Errors } from "../common/errors/app-error.js";
import { sha256 } from "../common/utils/crypto.js";
import { SESSION_COOKIE } from "../modules/auth/session.js";

/** How often a session's `lastUsedAt` is refreshed (milliseconds). */
const TOUCH_INTERVAL = 5 * 60 * 1000;

/**
 * Requires a valid, unexpired, unrevoked session belonging to an active user.
 * The session cookie holds a random token; only its SHA-256 is stored in the database.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token || typeof token !== "string") return next(Errors.unauthorized());

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  const now = new Date();
  if (!session || session.revokedAt || session.expiresAt <= now || session.user.status !== "ACTIVE") {
    return next(Errors.unauthorized("Your session has expired. Please sign in again"));
  }

  if (!session.lastUsedAt || now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL) {
    // Fire and forget: failing to touch the session must not fail the request.
    void prisma.adminSession.update({ where: { id: session.id }, data: { lastUsedAt: now } }).catch(() => undefined);
  }

  req.auth = {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    sessionId: session.id,
    sessionToken: token,
  };
  next();
};

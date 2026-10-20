import type { RequestHandler } from "express";
import { Errors } from "../common/errors/app-error.js";
import { hmac, safeEqual } from "../common/utils/crypto.js";
import { isAllowedOrigin } from "../config/cors.js";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** CSRF token bound to one session: HMAC of the session token. Returned by login and /auth/me. */
export const csrfTokenFor = (sessionToken: string) => hmac(`csrf:${sessionToken}`);

/**
 * Defence for cookie-authenticated mutations (must run after `authenticate`):
 *  1. The Origin header, when present, must be an allowed origin.
 *  2. `X-CSRF-Token` must equal the token derived from this session.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE.has(req.method)) return next();
  if (!req.auth) return next(Errors.unauthorized());

  if (!isAllowedOrigin(req.get("origin") ?? undefined)) return next(Errors.csrf("Request origin is not allowed"));

  const header = req.get("x-csrf-token");
  if (!header || !safeEqual(header, csrfTokenFor(req.auth.sessionToken))) return next(Errors.csrf());
  next();
};

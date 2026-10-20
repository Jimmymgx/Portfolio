import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";
import { Errors } from "../common/errors/app-error.js";
import { isTest } from "../config/env.js";

function limiter(options: { windowMs: number; limit: number; message: string; key?: (req: Request) => string }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: isTest ? 10_000 : options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => options.key?.(req) ?? ipKeyGenerator(req.ip ?? ""),
    handler: (_req, _res, next) => next(Errors.rateLimited(options.message)),
  });
}

/** Whole API, per IP. */
export const apiLimiter = limiter({ windowMs: 60_000, limit: 600, message: "Too many requests. Please slow down" });

/** Sign-in attempts, per IP and email. */
export const loginLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 10,
  message: "Too many sign-in attempts. Try again in a few minutes",
  key: (req) => `${ipKeyGenerator(req.ip ?? "")}:${String((req.body as { email?: unknown })?.email ?? "").toLowerCase()}`,
});

/** Public contact form, per IP. */
export const contactLimiter = limiter({
  windowMs: 60 * 60_000,
  limit: 5,
  message: "You have sent several messages recently. Please try again later",
});

/** Uploads, per IP. */
export const uploadLimiter = limiter({ windowMs: 10 * 60_000, limit: 60, message: "Too many uploads. Try again shortly" });

import type { RequestHandler } from "express";
import type { AdminRole } from "@portfolio/validation";
import { Errors } from "../common/errors/app-error.js";

const RANK: Record<AdminRole, number> = { VIEWER: 1, EDITOR: 2, SUPER_ADMIN: 3 };

/** Allows the request when the signed-in user has at least the given role. Enforced on the server for every route. */
export const requireRole =
  (minimum: AdminRole): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(Errors.unauthorized());
    if (RANK[req.auth.role] < RANK[minimum]) return next(Errors.forbidden());
    next();
  };

export const viewer = requireRole("VIEWER");
export const editor = requireRole("EDITOR");
export const superAdmin = requireRole("SUPER_ADMIN");

export const hasRole = (role: AdminRole, minimum: AdminRole) => RANK[role] >= RANK[minimum];

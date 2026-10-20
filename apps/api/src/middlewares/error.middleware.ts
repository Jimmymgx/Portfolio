import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiFailure } from "@portfolio/types";
import { ZodError } from "zod";
import multer from "multer";
import { logger } from "../common/logger.js";
import { AppError, Errors } from "../common/errors/app-error.js";
import { isProduction } from "../config/env.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(Errors.notFound(`Route ${req.method} ${req.path}`));
};

/** Maps database errors to safe client errors. Returns null when the error is not a recognised database error. */
function fromDatabase(err: unknown): AppError | null {
  const e = err as { code?: unknown; meta?: { target?: unknown }; message?: string; name?: string };
  const code = typeof e?.code === "string" ? e.code : "";
  const message = String(e?.message ?? "");
  if (code === "P2002" || /Duplicate entry/i.test(message)) {
    const target = Array.isArray(e.meta?.target) ? (e.meta?.target as string[]).join(", ") : undefined;
    return Errors.conflict("A record with the same unique value already exists", target ? [{ fields: target }] : []);
  }
  if (code === "P2003" || /foreign key constraint/i.test(message)) {
    return Errors.conflict("This record is still referenced by other content and cannot be changed this way");
  }
  if (code === "P2025") return Errors.notFound("Record");
  if (code.startsWith("P") && /^P\d{4}$/.test(code)) return new AppError(500, "DATABASE_ERROR", "Database error");
  return null;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) appError = err;
  else if (err instanceof ZodError) {
    appError = Errors.validation(err.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  } else if (err instanceof multer.MulterError) {
    appError =
      err.code === "LIMIT_FILE_SIZE"
        ? Errors.upload("The file is too large", 413)
        : Errors.upload(`Upload failed: ${err.message}`);
  } else if ((err as { type?: string })?.type === "entity.too.large") {
    appError = new AppError(413, "VALIDATION_ERROR", "Request body is too large");
  } else if ((err as { type?: string })?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    appError = Errors.validation([], "Malformed JSON body");
  } else {
    appError = fromDatabase(err) ?? Errors.internal();
  }

  if (appError.status >= 500) {
    // Log the real error (without secrets thanks to logger redaction), never return it.
    logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  }

  const body: ApiFailure = {
    success: false,
    message: appError.status >= 500 && isProduction ? "Something went wrong" : appError.message,
    error: { code: appError.code, details: appError.details },
  };
  res.status(appError.status).json(body);
};

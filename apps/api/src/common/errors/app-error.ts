import type { ErrorCode } from "@portfolio/types";

/** An error whose message is safe to show to the client. Anything else becomes a generic 500. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: unknown[];

  constructor(status: number, code: ErrorCode, message: string, details: unknown[] = []) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  validation: (details: unknown[], message = "Validation failed") => new AppError(400, "VALIDATION_ERROR", message, details),
  unauthorized: (message = "Authentication required") => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have permission to do this") => new AppError(403, "FORBIDDEN", message),
  csrf: (message = "Security check failed. Reload the page and try again") => new AppError(403, "CSRF_FAILED", message),
  notFound: (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found`),
  conflict: (message: string, details: unknown[] = []) => new AppError(409, "CONFLICT", message, details),
  upload: (message: string, status = 400) => new AppError(status, "UPLOAD_ERROR", message),
  rateLimited: (message = "Too many requests. Please try again later") => new AppError(429, "RATE_LIMITED", message),
  internal: (message = "Something went wrong") => new AppError(500, "INTERNAL_ERROR", message),
};

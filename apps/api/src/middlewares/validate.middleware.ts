import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { Errors } from "../common/errors/app-error.js";

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates and replaces body, query and params with the parsed (typed, defaulted, trimmed) values.
 * Unknown keys are stripped by the schemas, so handlers only ever see declared fields.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const issues: { location: string; path: string; message: string }[] = [];

    for (const location of ["params", "query", "body"] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(req[location] ?? {});
      if (!result.success) {
        for (const i of result.error.issues) {
          issues.push({ location, path: i.path.join("."), message: i.message });
        }
        continue;
      }
      if (location === "query") {
        // Express 5 exposes `req.query` as a getter, so shadow it with the parsed value.
        Object.defineProperty(req, "query", { value: result.data, writable: true, configurable: true, enumerable: true });
      } else {
        (req as unknown as Record<string, unknown>)[location] = result.data;
      }
    }

    if (issues.length) return next(Errors.validation(issues));
    next();
  };
}

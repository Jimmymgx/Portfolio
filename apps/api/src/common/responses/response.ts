import type { Response } from "express";
import type { ApiSuccess, PageMeta } from "@portfolio/types";

export function ok<T>(res: Response, data: T, message = "Operation completed successfully", meta: PageMeta | null = null) {
  const body: ApiSuccess<T> = { success: true, message, data, meta };
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, message = "Created successfully") {
  const body: ApiSuccess<T> = { success: true, message, data, meta: null };
  return res.status(201).json(body);
}

export function noContent(res: Response) {
  return res.status(204).end();
}

export function paginated<T>(res: Response, items: T[], meta: PageMeta, message = "Operation completed successfully") {
  return ok(res, items, message, meta);
}

/** Standard response envelopes used by every endpoint. */

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T, M = PageMeta | null> {
  success: true;
  message: string;
  data: T;
  meta: M;
}

export interface ApiErrorBody {
  code: string;
  details: unknown[];
}

export interface ApiFailure {
  success: false;
  message: string;
  error: ApiErrorBody;
}

export type ApiResponse<T, M = PageMeta | null> = ApiSuccess<T, M> | ApiFailure;

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "UPLOAD_ERROR",
  "RATE_LIMITED",
  "CSRF_FAILED",
  "DATABASE_ERROR",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

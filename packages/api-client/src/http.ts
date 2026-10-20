import type { ApiFailure, ApiSuccess, PageMeta } from "@portfolio/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level problems from a VALIDATION_ERROR, keyed by field path. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) {
      const item = d as { path?: string; message?: string };
      if (item?.path && item.message && !(item.path in out)) out[item.path] = item.message;
    }
    return out;
  }
}

export interface ClientOptions {
  /** For example http://localhost:4000/api/v1 */
  baseUrl: string;
  /** Browsers must send the session cookie to the API: use "include" for the dashboard. */
  credentials?: RequestCredentials;
  fetchImpl?: typeof fetch;
  /** Returns the CSRF token to send on writes. */
  getCsrfToken?: () => string | null;
  /** Called on every 401 so the app can send the user to the sign-in page. */
  onUnauthorized?: () => void;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  /** Extra `fetch` init, for example Next.js `{ next: { tags: [...] } }`. */
  init?: RequestInit & Record<string, unknown>;
  signal?: AbortSignal;
}

export interface Result<T> {
  data: T;
  meta: PageMeta | null;
  message: string;
}

export type Http = <T>(method: string, path: string, options?: RequestOptions) => Promise<Result<T>>;

export function createHttp(options: ClientOptions): Http {
  // Resolve `fetch` at call time, not at import time: Next.js replaces the global fetch with a caching version
  // (data cache, tags, revalidate). Capturing the original here would silently disable all of that.
  const doFetch: typeof fetch = (...args) => (options.fetchImpl ?? globalThis.fetch)(...args);
  const base = options.baseUrl.replace(/\/$/, "");

  return async function request<T>(method: string, path: string, o: RequestOptions = {}): Promise<Result<T>> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(o.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));

    const headers: Record<string, string> = { Accept: "application/json", ...(o.headers ?? {}) };
    let body: BodyInit | undefined;
    if (o.formData) body = o.formData;
    else if (o.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(o.body);
    }
    if (method !== "GET" && method !== "HEAD") {
      const csrf = options.getCsrfToken?.();
      if (csrf) headers["X-CSRF-Token"] = csrf;
    }

    let res: Response;
    try {
      res = await doFetch(url, { ...(o.init ?? {}), method, headers, body, credentials: options.credentials, signal: o.signal });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
    }

    if (res.status === 204) return { data: null as T, meta: null, message: "" };

    let json: ApiSuccess<T> | ApiFailure | null = null;
    try {
      json = (await res.json()) as ApiSuccess<T> | ApiFailure;
    } catch {
      /* non-JSON error page */
    }

    if (!res.ok || !json || json.success === false) {
      if (res.status === 401) options.onUnauthorized?.();
      const failure = json && json.success === false ? json : null;
      throw new ApiError(res.status, failure?.error.code ?? "HTTP_ERROR", failure?.message ?? `Request failed (${res.status})`, failure?.error.details ?? []);
    }
    return { data: json.data, meta: (json.meta as PageMeta | null) ?? null, message: json.message };
  };
}

import { ApiError, createAdminClient } from "@portfolio/api-client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** One client for the whole dashboard. The session lives in an HttpOnly cookie the browser sends automatically. */
export const api = createAdminClient({
  baseUrl: API_URL,
  onUnauthorized: () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("cms:unauthorized"));
  },
});

/** Message safe to show to a person. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export { ApiError };

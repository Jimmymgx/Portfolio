import { createPublicClient } from "@portfolio/api-client";
import type { PublicLang, PublicPortfolio } from "@portfolio/types";

/** Server-side API address (can be an internal network address). Falls back to the public one. */
const SERVER_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Address the visitor's browser uses (contact form). */
export const BROWSER_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const client = createPublicClient({ baseUrl: SERVER_URL });

/** Cache tag the API invalidates through POST /api/revalidate whenever content is published. */
export const PORTFOLIO_TAG = "portfolio";

/**
 * Reads everything the home page needs. Published content is cached by Next under a tag, so a publish in the CMS
 * refreshes it at once; a five-minute window is a safety net, not the main mechanism. Draft previews are never cached.
 */
export function fetchPortfolio(lang: PublicLang, previewToken?: string | null): Promise<PublicPortfolio> {
  return client.portfolio(lang, {
    previewToken,
    init: previewToken
      ? { signal: AbortSignal.timeout(8000) }
      : { signal: AbortSignal.timeout(8000), next: { tags: [PORTFOLIO_TAG], revalidate: 300 } },
  });
}

export async function verifyPreviewToken(token: string): Promise<boolean> {
  try {
    return await client.verifyPreview(token);
  } catch {
    return false;
  }
}

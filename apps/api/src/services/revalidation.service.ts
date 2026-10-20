import { logger } from "../common/logger.js";
import { env } from "../config/env.js";

/**
 * Tells the public website to drop its cached content. Called after every publish, unpublish or content change.
 * Failures are logged and never fail the CMS action: the site also revalidates on its own schedule.
 */
export async function revalidateWebsite(tags: string[] = ["portfolio"]): Promise<void> {
  if (!env.REVALIDATE_SECRET) {
    logger.debug("REVALIDATE_SECRET is not set; skipping website cache invalidation");
    return;
  }
  const url = env.WEB_REVALIDATE_URL ?? `${env.PUBLIC_WEB_URL.replace(/\/$/, "")}/api/revalidate`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": env.REVALIDATE_SECRET },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) logger.warn({ status: res.status }, "Website revalidation was rejected");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Website revalidation failed");
  }
}

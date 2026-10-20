import type { MetadataRoute } from "next";
import { fetchPortfolio } from "@/lib/api";
import { SITE_SETTINGS } from "@/lib/data";

/** The site address comes from the CMS (Site settings), then from NEXT_PUBLIC_SITE_URL. */
async function siteUrl(): Promise<string | null> {
  try {
    return (await fetchPortfolio("en")).site?.siteUrl ?? SITE_SETTINGS.siteUrl;
  } catch {
    return SITE_SETTINGS.siteUrl;
  }
}

export const revalidate = 300;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (await siteUrl())?.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}

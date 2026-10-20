import type { MetadataRoute } from "next";
import { fetchPortfolio } from "@/lib/api";
import { SITE_SETTINGS } from "@/lib/data";
import { LOCALES } from "@/lib/i18n";

export const revalidate = 300;

/** Empty until a production domain is known (CMS Site settings or NEXT_PUBLIC_SITE_URL). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let url: string | null = SITE_SETTINGS.siteUrl;
  try {
    url = (await fetchPortfolio("en")).site?.siteUrl ?? url;
  } catch {
    /* keep the fallback */
  }
  const base = url?.replace(/\/$/, "");
  if (!base) return [];
  return LOCALES.map((l) => ({
    url: `${base}/${l}`,
    lastModified: new Date(),
    alternates: { languages: Object.fromEntries(LOCALES.map((x) => [x, `${base}/${x}`])) },
  }));
}

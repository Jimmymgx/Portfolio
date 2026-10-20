import type { MetadataRoute } from "next";
import { SITE_SETTINGS } from "@/lib/data";
import { LOCALES } from "@/lib/i18n";

/** Empty until the production domain is set (NEXT_PUBLIC_SITE_URL or SITE_SETTINGS.siteUrl). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_SETTINGS.siteUrl?.replace(/\/$/, "");
  if (!base) return [];
  return LOCALES.map((l) => ({
    url: `${base}/${l}`,
    lastModified: new Date(),
    alternates: { languages: Object.fromEntries(LOCALES.map((x) => [x, `${base}/${x}`])) },
  }));
}

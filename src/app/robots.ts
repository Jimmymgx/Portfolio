import type { MetadataRoute } from "next";
import { SITE_SETTINGS } from "@/lib/data";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_SETTINGS.siteUrl?.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}

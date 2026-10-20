"use client";

import { seoFields } from "@portfolio/validation";
import { SingletonPage } from "@/components/resource/singleton-page";
import { api } from "@/lib/api";

export default function SeoPage() {
  return (
    <SingletonPage
      id="seo-home"
      title="SEO"
      description="How the home page appears in search results and when shared on social networks. Drafts are never visible to search engines."
      client={api.seo("home")}
      schema={seoFields}
      defaults={{ robotsIndex: true, robotsFollow: true }}
      groups={[
        {
          title: "Search results",
          fields: [
            { kind: "text", name: "title", label: "Page title", bilingual: true, max: 200, description: "Around 50 to 60 characters works best." },
            { kind: "textarea", name: "description", label: "Meta description", bilingual: true, rows: 3, max: 500, description: "Around 150 to 160 characters works best." },
            { kind: "url", name: "canonicalUrl", label: "Canonical URL", wide: true, description: "Only set this if the site is reachable at more than one address." },
          ],
        },
        {
          title: "Social sharing",
          fields: [
            { kind: "text", name: "ogTitle", label: "Share title", bilingual: true },
            { kind: "textarea", name: "ogDescription", label: "Share description", bilingual: true, rows: 3 },
            { kind: "media", name: "ogImageMediaId", label: "Share image", accept: "image", wide: true, description: "1200×630 pixels is ideal." },
          ],
        },
        {
          title: "Indexing",
          fields: [
            { kind: "switch", name: "robotsIndex", label: "Allow search engines to index this page", wide: true },
            { kind: "switch", name: "robotsFollow", label: "Allow search engines to follow links", wide: true },
          ],
        },
      ]}
    />
  );
}

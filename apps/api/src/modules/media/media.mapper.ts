import type { MediaDto } from "@portfolio/types";
import { absoluteMediaUrl } from "../../common/storage/storage.js";
import type { Media } from "../../generated/prisma/client.js";

/** Relations through which a media row can be referenced. The names match the back-relations in schema.prisma. */
export const USAGE_RELATIONS = {
  profileAvatars: "Profile avatar",
  profileResumes: "Profile résumé",
  heroMp4: "Hero video (MP4)",
  heroWebm: "Hero video (WebM)",
  heroPosters: "Hero poster",
  heroFallbacks: "Hero fallback image",
  aboutPortraits: "About ID card portrait",
  skillLogos: "Skill logo",
  projectMedia: "Project gallery",
  projectOgImages: "Project social image",
  certificationImages: "Certification image",
  achievementLogos: "Achievement logo",
  seoOgImages: "SEO social image",
  siteFavicons: "Site favicon",
  siteLogos: "Site logo",
} as const;

export type UsageRelation = keyof typeof USAGE_RELATIONS;

export const usageCountSelect = Object.fromEntries(Object.keys(USAGE_RELATIONS).map((k) => [k, true])) as Record<UsageRelation, true>;

type MediaRow = Media & { _count?: Record<string, number> };

export function toMediaDto(m: MediaRow): MediaDto {
  return {
    id: m.id,
    originalName: m.originalName,
    title: m.title,
    publicUrl: absoluteMediaUrl(m.publicUrl) ?? m.publicUrl,
    mimeType: m.mimeType,
    kind: m.kind,
    fileSize: m.fileSize,
    width: m.width,
    height: m.height,
    altText: m.altText,
    altTextAr: m.altTextAr,
    storageProvider: m.storageProvider,
    createdAt: m.createdAt.toISOString(),
    ...(m._count ? { usageCount: Object.values(m._count).reduce((a, b) => a + b, 0) } : {}),
  };
}

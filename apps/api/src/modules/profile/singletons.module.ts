import {
  aboutFields,
  aboutUpdate,
  contactFields,
  contactUpdate,
  heroFields,
  heroUpdate,
  profileFields,
  profileUpdate,
  seoFields,
  seoParams,
  seoUpdate,
  siteFields,
  siteUpdate,
} from "@portfolio/validation";
import { singletonRouter } from "../../common/crud/singleton.routes.js";
import { SingletonService } from "../../common/crud/singleton.service.js";
import { prisma } from "../../config/database.js";

/**
 * Profile, hero, about, contact, site and SEO are single records that are edited as a draft and then published.
 * Each is stored as two rows (DRAFT and PUBLISHED). See SingletonService.
 */

export const profileService = new SingletonService({
  entity: "Profile",
  auditType: "profile",
  delegateFor: (db) => db.profile,
  fields: profileFields,
  media: { avatarMediaId: "avatar", resumeMediaId: "resume" },
  include: { avatar: true, resume: true },
});
export const profileRouter = singletonRouter({ service: profileService, update: profileUpdate, fields: profileFields, tag: "Profile", path: "/admin/profile", singular: "profile" });

export const heroService = new SingletonService({
  entity: "Hero",
  auditType: "hero",
  delegateFor: (db) => db.hero,
  fields: heroFields,
  defaults: { audioEnabled: true },
  media: { videoMp4MediaId: "videoMp4", videoWebmMediaId: "videoWebm", posterMediaId: "poster", fallbackImageMediaId: "fallbackImage" },
  include: { videoMp4: true, videoWebm: true, poster: true, fallbackImage: true },
});
export const heroRouter = singletonRouter({ service: heroService, update: heroUpdate, fields: heroFields, tag: "Hero", path: "/admin/hero", singular: "hero" });

export const aboutService = new SingletonService({
  entity: "About",
  auditType: "about",
  delegateFor: (db) => db.about,
  fields: aboutFields,
  defaults: { showIdCard: true },
  media: { idCardPortraitMediaId: "idCardPortrait" },
  include: { idCardPortrait: true },
});
export const aboutRouter = singletonRouter({ service: aboutService, update: aboutUpdate, fields: aboutFields, tag: "About", path: "/admin/about", singular: "about section" });

export const contactService = new SingletonService({
  entity: "ContactSettings",
  auditType: "contact",
  delegateFor: (db) => db.contactSettings,
  fields: contactFields,
  defaults: { showPhone: false, showWhatsapp: false, enableContactForm: false },
});
export const contactRouter = singletonRouter({ service: contactService, update: contactUpdate, fields: contactFields, tag: "Contact", path: "/admin/contact", singular: "contact settings" });

export const siteService = new SingletonService({
  entity: "SiteSettings",
  auditType: "site",
  delegateFor: (db) => db.siteSettings,
  fields: siteFields,
  defaults: { primaryLanguage: "EN", maintenanceMode: false },
  media: { faviconMediaId: "favicon", logoMediaId: "logo" },
  include: { favicon: true, logo: true },
});
export const siteRouter = singletonRouter({ service: siteService, update: siteUpdate, fields: siteFields, tag: "Settings", path: "/admin/settings", singular: "site settings" });

export const seoService = new SingletonService({
  entity: "SeoSettings",
  auditType: "seo",
  delegateFor: (db) => db.seoSettings,
  fields: seoFields,
  defaults: { robotsIndex: true, robotsFollow: true },
  media: { ogImageMediaId: "ogImage" },
  include: { ogImage: true },
});
export const seoRouter = singletonRouter({
  service: seoService,
  update: seoUpdate,
  fields: seoFields,
  tag: "SEO",
  path: "/admin/seo",
  singular: "SEO settings",
  keyParam: { name: "pageKey", schema: seoParams.shape.pageKey },
});

/** Used by the public layer: published (or draft for previews) row of a singleton. */
export async function readSingleton<T>(model: "profile" | "hero" | "about" | "contactSettings" | "siteSettings", preview: boolean, include?: Record<string, unknown>): Promise<T | null> {
  const d = prisma[model] as unknown as { findFirst(args: unknown): Promise<T | null> };
  if (preview) {
    const draft = await d.findFirst({ where: { state: "DRAFT" }, ...(include ? { include } : {}) });
    if (draft) return draft;
  }
  return d.findFirst({ where: { state: "PUBLISHED" }, ...(include ? { include } : {}) });
}

export async function readSeo<T>(pageKey: string, preview: boolean): Promise<T | null> {
  const d = prisma.seoSettings as unknown as { findFirst(args: unknown): Promise<T | null> };
  const include = { ogImage: true };
  if (preview) {
    const draft = await d.findFirst({ where: { pageKey, state: "DRAFT" }, include });
    if (draft) return draft;
  }
  return d.findFirst({ where: { pageKey, state: "PUBLISHED" }, include });
}


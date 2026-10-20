import { z } from "zod";
import { listQuery, mediaRef, optEmail, optHttpUrl, optLinkTarget, optText, text, languageSchema, sortOrder, publishStatusSchema } from "./common.js";

/**
 * Singleton content (profile, hero, about, contact, site, seo) is edited as a draft and then published.
 * PATCH bodies are partial; the service merges them into the draft row.
 */

/* ───────── profile ───────── */

export const profileFields = z.object({
  fullName: text(160),
  fullNameAr: optText(160),
  displayName: text(160),
  displayNameAr: optText(160),
  firstName: text(80),
  firstNameAr: optText(80),
  initials: text(6),
  professionalTitle: text(160),
  professionalTitleAr: optText(160),
  roleLine: optText(200),
  roleLineAr: optText(200),
  tagline: optText(255),
  taglineAr: optText(255),
  expertise: optText(255),
  expertiseAr: optText(255),
  audience: optText(255),
  audienceAr: optText(255),
  location: optText(160),
  locationAr: optText(160),
  publicEmail: optEmail,
  publicPhone: optText(40),
  biography: optText(5000),
  biographyAr: optText(5000),
  shortBiography: optText(1500),
  shortBiographyAr: optText(1500),
  professionalStatement: optText(1500),
  professionalStatementAr: optText(1500),
  avatarMediaId: mediaRef,
  resumeMediaId: mediaRef,
});
export const profileUpdate = profileFields.partial();
export type ProfileFields = z.infer<typeof profileFields>;
export type ProfileUpdate = z.infer<typeof profileUpdate>;

/* ───────── hero ───────── */

export const heroFields = z.object({
  headline: optText(200),
  headlineAr: optText(200),
  subtitle: optText(200),
  subtitleAr: optText(200),
  description: optText(1200),
  descriptionAr: optText(1200),
  backgroundWord: optText(60),
  backgroundWordAr: optText(60),
  primaryButtonText: optText(80),
  primaryButtonTextAr: optText(80),
  primaryButtonUrl: optLinkTarget,
  secondaryButtonText: optText(80),
  secondaryButtonTextAr: optText(80),
  secondaryButtonUrl: optLinkTarget,
  audioEnabled: z.boolean(),
  videoMp4MediaId: mediaRef,
  videoWebmMediaId: mediaRef,
  posterMediaId: mediaRef,
  fallbackImageMediaId: mediaRef,
});
export const heroUpdate = heroFields.partial();
export type HeroUpdate = z.infer<typeof heroUpdate>;

/* ───────── about ───────── */

export const aboutFields = z.object({
  heading: optText(160),
  headingAr: optText(160),
  introduction: optText(2000),
  introductionAr: optText(2000),
  fullDescription: optText(6000),
  fullDescriptionAr: optText(6000),
  quote: optText(500),
  quoteAr: optText(500),
  idCardTitle: optText(60),
  idCardTitleAr: optText(60),
  idCardSubtitle: optText(120),
  idCardSubtitleAr: optText(120),
  idCardBackContent: optText(500),
  idCardBackContentAr: optText(500),
  idCardPortraitMediaId: mediaRef,
  showIdCard: z.boolean(),
});
export const aboutUpdate = aboutFields.partial();
export type AboutUpdate = z.infer<typeof aboutUpdate>;

export const aboutFactFields = z.object({
  label: text(80),
  labelAr: optText(80),
  value: text(255),
  valueAr: optText(255),
  icon: optText(60),
  sortOrder: sortOrder.optional(),
  status: publishStatusSchema.optional(),
});
export const aboutFactCreate = aboutFactFields;
export const aboutFactUpdate = aboutFactFields.partial();
export const aboutFactList = listQuery.extend({ status: publishStatusSchema.optional() });

/* ───────── contact settings ───────── */

export const contactFields = z.object({
  heading: optText(200),
  headingAr: optText(200),
  description: optText(500),
  descriptionAr: optText(500),
  publicEmail: optEmail,
  publicPhone: optText(40),
  whatsappUrl: optHttpUrl,
  showPhone: z.boolean(),
  showWhatsapp: z.boolean(),
  enableContactForm: z.boolean(),
});
export const contactUpdate = contactFields.partial();

/* ───────── site settings ───────── */

export const siteFields = z.object({
  siteName: text(160),
  siteNameAr: optText(160),
  siteDescription: optText(500),
  siteDescriptionAr: optText(500),
  siteUrl: optHttpUrl,
  primaryLanguage: z.enum(["EN", "AR"]),
  footerText: optText(300),
  footerTextAr: optText(300),
  maintenanceMode: z.boolean(),
  faviconMediaId: mediaRef,
  logoMediaId: mediaRef,
});
export const siteUpdate = siteFields.partial();

/* ───────── seo ───────── */

export const seoFields = z.object({
  title: optText(200),
  titleAr: optText(200),
  description: optText(500),
  descriptionAr: optText(500),
  canonicalUrl: optHttpUrl,
  ogTitle: optText(200),
  ogTitleAr: optText(200),
  ogDescription: optText(500),
  ogDescriptionAr: optText(500),
  ogImageMediaId: mediaRef,
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
});
export const seoUpdate = seoFields.partial();
export const seoParams = z.object({ pageKey: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/) });

/* ───────── preview ───────── */

export const previewTokenBody = z.object({
  locale: languageSchema.default("en"),
  path: z.string().trim().max(200).default("/"),
});

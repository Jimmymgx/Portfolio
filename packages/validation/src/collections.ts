import { z } from "zod";
import {
  boolQuery,
  dateOnly,
  httpUrl,
  listQuery,
  mediaRef,
  optDateOnly,
  optHttpUrl,
  optText,
  publishStatusSchema,
  slug,
  sortOrder,
  text,
} from "./common.js";

/**
 * Ordered, publishable collections. Every create schema omits `sortOrder` (appended at the end by the service)
 * and `status` (defaults to DRAFT). Update schemas are partial.
 */
const common = {
  sortOrder: sortOrder.optional(),
  status: publishStatusSchema.optional(),
};

const statusQuery = { status: publishStatusSchema.optional() };

/* ───────── skills ───────── */

export const skillCategoryFields = z.object({
  name: text(80),
  nameAr: optText(80),
  slug: slug.optional(),
  description: optText(300),
  descriptionAr: optText(300),
  ...common,
});
export const skillCategoryCreate = skillCategoryFields;
export const skillCategoryUpdate = skillCategoryFields.partial();
export const skillCategoryList = listQuery.extend(statusQuery);

export const skillFields = z.object({
  name: text(100),
  slug: slug.optional(),
  symbol: text(3),
  categoryId: z.number().int().positive(),
  logoMediaId: mediaRef,
  externalLogoReference: optText(60),
  description: optText(300),
  descriptionAr: optText(300),
  projectIds: z.array(z.number().int().positive()).max(200).optional(),
  ...common,
});
export const skillCreate = skillFields;
export const skillUpdate = skillFields.partial();
export const skillList = listQuery.extend({
  ...statusQuery,
  categoryId: z.coerce.number().int().positive().optional(),
});

/* ───────── projects ───────── */

export const VISUAL_KINDS = ["WEBSITE", "WEB_MOBILE", "MOBILE", "SYSTEM"] as const;
export const PROJECT_STAGES = ["COMPLETED", "IN_PROGRESS", "MAINTENANCE", "ARCHIVED"] as const;

export const projectCategoryFields = z.object({
  name: text(80),
  nameAr: optText(80),
  slug: slug.optional(),
  visualKind: z.enum(VISUAL_KINDS),
  sortOrder: sortOrder.optional(),
});
export const projectCategoryCreate = projectCategoryFields;
export const projectCategoryUpdate = projectCategoryFields.partial();

export const projectFields = z.object({
  title: text(160),
  titleAr: optText(160),
  slug: slug.optional(),
  categoryId: z.number().int().positive(),
  shortDescription: optText(600),
  shortDescriptionAr: optText(600),
  fullDescription: optText(8000),
  fullDescriptionAr: optText(8000),
  problemStatement: optText(4000),
  problemStatementAr: optText(4000),
  solution: optText(4000),
  solutionAr: optText(4000),
  role: optText(255),
  roleAr: optText(255),
  stage: z.enum(PROJECT_STAGES),
  liveUrl: optHttpUrl,
  repositoryUrl: optHttpUrl,
  featured: z.boolean(),
  seoTitle: optText(200),
  seoTitleAr: optText(200),
  seoDescription: optText(500),
  seoDescriptionAr: optText(500),
  canonicalUrl: optHttpUrl,
  ogImageMediaId: mediaRef,
  skillIds: z.array(z.number().int().positive()).max(100).optional(),
  ...common,
});
export const projectCreate = projectFields.partial({
  stage: true,
  featured: true,
});
export const projectUpdate = projectFields.partial();
export const projectList = listQuery.extend({
  ...statusQuery,
  categoryId: z.coerce.number().int().positive().optional(),
  featured: boolQuery.optional(),
});

export const projectFeatureFields = z.object({
  title: text(160),
  titleAr: optText(160),
  description: optText(500),
  descriptionAr: optText(500),
  sortOrder: sortOrder.optional(),
});
export const projectFeatureCreate = projectFeatureFields.extend({ projectId: z.number().int().positive() });
export const projectFeatureUpdate = projectFeatureFields.partial();
export const projectFeatureList = listQuery.extend({ projectId: z.coerce.number().int().positive().optional() });

export const projectMediaAttach = z.object({
  mediaId: z.number().int().positive(),
  caption: optText(300),
  captionAr: optText(300),
  isCover: z.boolean().optional(),
  isIllustrative: z.boolean().optional(),
  sortOrder: sortOrder.optional(),
});
export const projectMediaCreate = projectMediaAttach.extend({ projectId: z.number().int().positive() });
export const projectMediaUpdate = projectMediaAttach.omit({ mediaId: true }).partial();
export const projectMediaList = listQuery.extend({ projectId: z.coerce.number().int().positive().optional() });
export const projectSkillsReplace = z.object({
  skillIds: z.array(z.number().int().positive()).max(100),
});

/* ───────── experience & education ───────── */

export const experienceFields = z.object({
  organization: text(160),
  organizationAr: optText(160),
  position: text(160),
  positionAr: optText(160),
  employmentType: optText(60),
  location: optText(160),
  locationAr: optText(160),
  startDate: dateOnly,
  endDate: optDateOnly,
  isCurrent: z.boolean(),
  description: optText(4000),
  descriptionAr: optText(4000),
  ...common,
});
const experienceRules = (v: { isCurrent?: boolean; endDate?: string | null; startDate?: string }) =>
  !(v.isCurrent && v.endDate) && !(v.endDate && v.startDate && v.endDate < v.startDate);
const experienceMessage = {
  path: ["endDate"],
  message: "A current position has no end date, and the end date cannot be before the start date",
};
export const experienceCreate = experienceFields.partial({ isCurrent: true }).refine(experienceRules, experienceMessage);
export const experienceUpdate = experienceFields.partial();
export const experienceList = listQuery.extend(statusQuery);

export const educationFields = z.object({
  institution: text(160),
  institutionAr: optText(160),
  qualification: text(160),
  qualificationAr: optText(160),
  fieldOfStudy: optText(160),
  fieldOfStudyAr: optText(160),
  startDate: optDateOnly,
  endDate: optDateOnly,
  description: optText(4000),
  descriptionAr: optText(4000),
  ...common,
});
export const educationCreate = educationFields;
export const educationUpdate = educationFields.partial();
export const educationList = listQuery.extend(statusQuery);

/* ───────── certifications & achievements ───────── */

export const certificationFields = z.object({
  title: text(200),
  titleAr: optText(200),
  issuer: text(160),
  issuerAr: optText(160),
  issueDate: optDateOnly,
  verificationUrl: optHttpUrl,
  description: optText(500),
  descriptionAr: optText(500),
  mediaId: mediaRef,
  ...common,
});
export const certificationCreate = certificationFields;
export const certificationUpdate = certificationFields.partial();
export const certificationList = listQuery.extend(statusQuery);

export const achievementFields = z.object({
  title: text(200),
  titleAr: optText(200),
  description: optText(500),
  descriptionAr: optText(500),
  numericValue: z.number().int().min(0).max(1_000_000_000).nullish(),
  numericSuffix: optText(10),
  platform: optText(120),
  logoMediaId: mediaRef,
  logoKey: optText(60),
  verificationUrl: optHttpUrl,
  ...common,
});
export const achievementCreate = achievementFields;
export const achievementUpdate = achievementFields.partial();
export const achievementList = listQuery.extend(statusQuery);

/* ───────── links ───────── */

export const SOCIAL_PLATFORMS = [
  "GITHUB",
  "LINKEDIN",
  "BEHANCE",
  "DRIBBBLE",
  "X",
  "YOUTUBE",
  "INSTAGRAM",
  "WEBSITE",
  "OTHER",
] as const;

export const socialLinkFields = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  label: text(80),
  labelAr: optText(80),
  handle: optText(120),
  url: httpUrl,
  icon: optText(60),
  ...common,
});
export const socialLinkCreate = socialLinkFields;
export const socialLinkUpdate = socialLinkFields.partial();
export const socialLinkList = listQuery.extend(statusQuery);

export type SkillCreate = z.infer<typeof skillCreate>;
export type ProjectCreate = z.infer<typeof projectCreate>;

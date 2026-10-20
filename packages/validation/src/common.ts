import { z } from "zod";

/* ───────── shared enums (string unions mirror the Prisma enums) ───────── */

export const LANGUAGES = ["en", "ar"] as const;
export const languageSchema = z.enum(LANGUAGES);
export type Lang = z.infer<typeof languageSchema>;

export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED", "UNPUBLISHED"] as const;
export const publishStatusSchema = z.enum(PUBLISH_STATUSES);
export type PublishStatus = z.infer<typeof publishStatusSchema>;

export const CONTENT_STATES = ["DRAFT", "PUBLISHED"] as const;
export const contentStateSchema = z.enum(CONTENT_STATES);
export type ContentState = z.infer<typeof contentStateSchema>;

export const SECTION_KEYS = [
  "HERO",
  "ABOUT",
  "SKILLS",
  "WORK",
  "CERTIFICATIONS",
  "EXPERIENCE",
  "ACHIEVEMENTS",
  "CONTACT",
] as const;
export const sectionKeySchema = z.enum(SECTION_KEYS);
export type SectionKey = z.infer<typeof sectionKeySchema>;

/* ───────── string helpers ───────── */

/** Required text. */
export const text = (max: number) => z.string().trim().min(1, "This field is required").max(max, `Use at most ${max} characters`);

/** Optional text. Empty strings are stored as null by the service layer. */
export const optText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`).nullish();

const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export const httpUrl = z.string().trim().max(512).refine(isHttpUrl, "Enter a valid http or https URL");
export const optHttpUrl = z.union([httpUrl, z.literal("")]).nullish();

/** Internal anchor, site path or absolute http(s) URL. Used for button and navigation targets. */
export const linkTarget = z
  .string()
  .trim()
  .max(512)
  .refine((v) => v.startsWith("#") || v.startsWith("/") || isHttpUrl(v), "Use #section, /path or a full http(s) URL");
export const optLinkTarget = z.union([linkTarget, z.literal("")]).nullish();

export const email = z.string().trim().toLowerCase().max(190).pipe(z.email("Enter a valid email address"));
export const optEmail = z.union([email, z.literal("")]).nullish();

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

/** Calendar date, `YYYY-MM-DD`. */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Enter a real date");
export const optDateOnly = z.union([dateOnly, z.literal("")]).nullish();

export const mediaRef = z.number().int().positive().nullish();
export const sortOrder = z.number().int().min(0).max(100000);

/* ───────── params, pagination, reorder ───────── */

export const idParams = z.object({ id: z.coerce.number().int().positive() });
export const cuidParams = z.object({ id: z.string().trim().min(10).max(40) });
export const slugParams = z.object({ slug: slug });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(40).optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type ListQuery = z.infer<typeof listQuery>;

export const reorderBody = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "Each id may appear only once"),
});
export type ReorderBody = z.infer<typeof reorderBody>;

export const publicQuery = z.object({ lang: languageSchema.default("en") });
export type PublicQuery = z.infer<typeof publicQuery>;

/** Query flag for the admin list endpoints. Booleans arrive as strings. */
export const boolQuery = z.enum(["true", "false"]).transform((v) => v === "true");

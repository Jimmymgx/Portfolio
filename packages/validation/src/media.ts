import { z } from "zod";
import { listQuery, optText } from "./common.js";

export const MEDIA_KINDS = ["IMAGE", "VIDEO", "DOCUMENT"] as const;
export const mediaKindSchema = z.enum(MEDIA_KINDS);

/** Limits enforced on upload. Kept here so the dashboard can show the same numbers. */
export const MEDIA_LIMITS = {
  image: { maxBytes: 8 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"] },
  video: { maxBytes: 80 * 1024 * 1024, mimes: ["video/mp4", "video/webm"] },
  document: { maxBytes: 15 * 1024 * 1024, mimes: ["application/pdf"] },
} as const;

export const mediaList = listQuery.extend({
  kind: mediaKindSchema.optional(),
  unused: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const mediaUpdate = z
  .object({
    title: optText(255),
    altText: optText(300),
    altTextAr: optText(300),
  })
  .partial();

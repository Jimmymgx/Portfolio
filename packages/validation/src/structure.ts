import { z } from "zod";
import { listQuery, optLinkTarget, optText, sectionKeySchema, sortOrder, text } from "./common.js";

export const navigationItemFields = z.object({
  sectionKey: sectionKeySchema.nullish(),
  label: text(80),
  labelAr: optText(80),
  targetUrl: optLinkTarget,
  sortOrder: sortOrder.optional(),
  isVisible: z.boolean().optional(),
});
export const navigationItemCreate = navigationItemFields;
export const navigationItemUpdate = navigationItemFields.partial();

export const sectionSettingUpdate = z
  .object({
    displayName: text(80),
    displayNameAr: optText(80),
    isEnabled: z.boolean(),
    /** Component-specific options only. Unknown keys are rejected. */
    configuration: z.object({ showNextCard: z.boolean().optional() }).strict().nullable(),
  })
  .partial();
export const sectionKeyParams = z.object({ key: sectionKeySchema });

/** Reorder sections: list every section key in the new order. */
export const sectionReorderBody = z.object({
  keys: z
    .array(sectionKeySchema)
    .min(1)
    .refine((k) => new Set(k).size === k.length, "Each section may appear only once"),
});

/* ───────── messages ───────── */

export const MESSAGE_STATUSES = ["NEW", "READ", "ARCHIVED"] as const;
export const messageStatusSchema = z.enum(MESSAGE_STATUSES);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

/** Public contact form. `website` is a honeypot: real visitors leave it empty. */
export const contactMessageBody = z.object({
  name: text(120),
  email: z.string().trim().toLowerCase().max(190).pipe(z.email("Enter a valid email address")),
  subject: optText(200),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(5000),
  website: z.string().max(0).optional(),
});
export const messageUpdateBody = z.object({ status: messageStatusSchema });
export const messageList = listQuery.extend({ status: messageStatusSchema.optional() });

/* ───────── audit ───────── */

export const auditLogList = listQuery.extend({
  entityType: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(80).optional(),
  actorId: z.string().trim().max(40).optional(),
  action: z.string().trim().max(80).optional(),
});

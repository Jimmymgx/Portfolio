import { z } from "zod";
import { cuidParams, email, listQuery, text } from "./common.js";

export const ADMIN_ROLES = ["SUPER_ADMIN", "EDITOR", "VIEWER"] as const;
export const adminRoleSchema = z.enum(ADMIN_ROLES);
export type AdminRole = z.infer<typeof adminRoleSchema>;

export const ADMIN_STATUSES = ["ACTIVE", "DISABLED"] as const;
export const adminStatusSchema = z.enum(ADMIN_STATUSES);

/** Password policy shared by the API and the dashboard forms. */
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Use at most 128 characters")
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "Use upper case, lower case and a number");

export const loginBody = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(128),
});

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one",
  });

export const userCreateBody = z.object({
  name: text(120),
  email,
  password: passwordSchema,
  role: adminRoleSchema,
});

export const userUpdateBody = z
  .object({
    name: text(120),
    role: adminRoleSchema,
    status: adminStatusSchema,
  })
  .partial();

export const userResetPasswordBody = z.object({ newPassword: passwordSchema });

export const userListQuery = listQuery.extend({
  role: adminRoleSchema.optional(),
  status: adminStatusSchema.optional(),
});

export const userParams = cuidParams;

export type LoginBody = z.infer<typeof loginBody>;
export type ChangePasswordBody = z.infer<typeof changePasswordBody>;
export type UserCreateBody = z.infer<typeof userCreateBody>;
export type UserUpdateBody = z.infer<typeof userUpdateBody>;

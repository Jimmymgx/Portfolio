import type { AdminUserDto } from "@portfolio/types";
import type { AdminUser } from "../../generated/prisma/client.js";

/** Whitelists the fields that may leave the server. The password hash is never included. */
export function toUserDto(u: AdminUser): AdminUserDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

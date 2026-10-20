import type { AdminRole } from "@portfolio/validation";

const RANK: Record<AdminRole, number> = { VIEWER: 1, EDITOR: 2, SUPER_ADMIN: 3 };

/** The API enforces roles on every request. This only hides controls the user could not use anyway. */
export const atLeast = (role: AdminRole | undefined, min: AdminRole) => !!role && RANK[role] >= RANK[min];

import type { SessionUserDto } from "@portfolio/types";
import { prisma } from "../../config/database.js";
import { Errors } from "../../common/errors/app-error.js";
import { hashPassword, verifyPassword } from "../../common/utils/crypto.js";
import { csrfTokenFor } from "../../middlewares/csrf.middleware.js";
import { audit } from "../audit-logs/audit.service.js";
import { toUserDto } from "../users/user.mapper.js";
import { createSession, revokeSession, revokeUserSessions } from "./session.js";

/** Verified against when the account does not exist, so response time does not reveal which emails are registered. */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-for-timing-only"));

const INVALID = "Incorrect email or password";

export const authService = {
  async login(email: string, password: string, userAgent?: string | null) {
    const user = await prisma.adminUser.findUnique({ where: { email } });
    const hash = user?.passwordHash ?? (await getDummyHash());
    const valid = await verifyPassword(password, hash);

    if (!user || !valid || user.status !== "ACTIVE") {
      await audit(null, { action: "auth.login_failed", entityType: "AdminUser", entityId: user?.id ?? null, metadata: { reason: !user ? "unknown_account" : user.status !== "ACTIVE" ? "disabled" : "bad_password" } });
      throw Errors.unauthorized(INVALID);
    }

    const { token, expiresAt } = await createSession(user.id, userAgent);
    const updated = await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit({ userId: user.id, email: user.email }, { action: "auth.login", entityType: "AdminUser", entityId: user.id });

    const payload: SessionUserDto = { user: toUserDto(updated), csrfToken: csrfTokenFor(token) };
    return { token, expiresAt, ...payload };
  },

  async logout(actor: { userId: string; email: string; sessionId: string }) {
    await revokeSession(actor.sessionId);
    await audit(actor, { action: "auth.logout", entityType: "AdminUser", entityId: actor.userId });
  },

  async me(userId: string, sessionToken: string): Promise<SessionUserDto> {
    const user = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) throw Errors.unauthorized();
    return { user: toUserDto(user), csrfToken: csrfTokenFor(sessionToken) };
  },

  async changePassword(actor: { userId: string; email: string; sessionId: string }, currentPassword: string, newPassword: string) {
    const user = await prisma.adminUser.findUnique({ where: { id: actor.userId } });
    if (!user) throw Errors.unauthorized();
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw Errors.validation([{ path: "currentPassword", message: "The current password is incorrect" }], "The current password is incorrect");
    }
    await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    // Sign out everywhere else; keep this session so the user is not kicked out mid-action.
    await revokeUserSessions(user.id, actor.sessionId);
    await audit(actor, { action: "auth.password_changed", entityType: "AdminUser", entityId: user.id });
  },
};

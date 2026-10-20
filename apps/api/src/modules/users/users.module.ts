import { Router } from "express";
import { z } from "zod";
import { userCreateBody, userListQuery, userParams, userResetPasswordBody, userUpdateBody } from "@portfolio/validation";
import type { Actor } from "../../common/crud/types.js";
import { Errors } from "../../common/errors/app-error.js";
import { jsonBody, jsonOk, pagedOk, readSecurity, writeSecurity } from "../../common/openapi.js";
import { created, noContent, ok, paginated } from "../../common/responses/response.js";
import { orderBy, pageArgs, pageMeta } from "../../common/pagination/pagination.js";
import { hashPassword } from "../../common/utils/crypto.js";
import { prisma } from "../../config/database.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { superAdmin } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { audit } from "../audit-logs/audit.service.js";
import { revokeUserSessions } from "../auth/session.js";
import { toUserDto } from "./user.mapper.js";

type ListQuery = z.infer<typeof userListQuery>;

/** The last active SUPER_ADMIN can never be demoted, disabled or deleted, so the CMS cannot lock itself out. */
async function assertNotLastSuperAdmin(userId: string) {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (user?.role === "SUPER_ADMIN" && user.status === "ACTIVE") {
    const others = await prisma.adminUser.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE", id: { not: userId } } });
    if (others === 0) throw Errors.conflict("This is the last active super administrator and cannot be removed, disabled or demoted");
  }
}

export const usersService = {
  async list(query: ListQuery) {
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.adminUser.findMany({ where, orderBy: orderBy(query, ["name", "email", "createdAt", "lastLoginAt"] as const, { field: "createdAt", order: "asc" }), ...pageArgs(query) }),
      prisma.adminUser.count({ where }),
    ]);
    return { items: rows.map(toUserDto), meta: pageMeta(query, total) };
  },

  async get(id: string) {
    const u = await prisma.adminUser.findUnique({ where: { id } });
    if (!u) throw Errors.notFound("User");
    return toUserDto(u);
  },

  async create(actor: Actor, input: z.infer<typeof userCreateBody>) {
    if (await prisma.adminUser.findUnique({ where: { email: input.email } })) throw Errors.conflict("An account with this email already exists");
    const u = await prisma.adminUser.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) } });
    await audit(actor, { action: "user.created", entityType: "AdminUser", entityId: u.id, metadata: { role: u.role } });
    return toUserDto(u);
  },

  async update(actor: Actor, id: string, input: z.infer<typeof userUpdateBody>) {
    const current = await prisma.adminUser.findUnique({ where: { id } });
    if (!current) throw Errors.notFound("User");
    const isSelf = id === actor.userId;
    if (isSelf && (input.role || input.status)) throw Errors.conflict("You cannot change your own role or status");
    if ((input.role && input.role !== "SUPER_ADMIN") || input.status === "DISABLED") await assertNotLastSuperAdmin(id);

    const u = await prisma.adminUser.update({ where: { id }, data: input });
    if (input.status === "DISABLED" || (input.role && input.role !== current.role)) await revokeUserSessions(id);
    await audit(actor, { action: "user.updated", entityType: "AdminUser", entityId: id, metadata: { fields: Object.keys(input) } });
    return toUserDto(u);
  },

  async resetPassword(actor: Actor, id: string, newPassword: string) {
    await this.get(id);
    await prisma.adminUser.update({ where: { id }, data: { passwordHash: await hashPassword(newPassword) } });
    await revokeUserSessions(id);
    await audit(actor, { action: "user.password_reset", entityType: "AdminUser", entityId: id });
  },

  async remove(actor: Actor, id: string) {
    if (id === actor.userId) throw Errors.conflict("You cannot delete your own account");
    await this.get(id);
    await assertNotLastSuperAdmin(id);
    await prisma.adminUser.delete({ where: { id } });
    await audit(actor, { action: "user.deleted", entityType: "AdminUser", entityId: id });
  },
};

const userDoc = z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.enum(["SUPER_ADMIN", "EDITOR", "VIEWER"]), status: z.enum(["ACTIVE", "DISABLED"]), lastLoginAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string() });
const idDoc = z.object({ id: z.string().describe("User id") });
const sec = { security: writeSecurity };

registry.registerPath({ method: "get", path: "/admin/users", tags: ["Users"], summary: "List administrators", description: "SUPER_ADMIN only.", security: readSecurity, request: { query: userListQuery as z.ZodObject }, responses: { 200: pagedOk("Users", userDoc), 403: errorResponses[403] } });
registry.registerPath({ method: "post", path: "/admin/users", tags: ["Users"], summary: "Create an administrator", description: "SUPER_ADMIN only. The password must be 12+ characters with upper case, lower case and a number.", ...sec, request: { body: jsonBody(userCreateBody) }, responses: { 201: jsonOk("Created", userDoc), 400: errorResponses[400], 409: errorResponses[409] } });
registry.registerPath({ method: "get", path: "/admin/users/{id}", tags: ["Users"], summary: "Get an administrator", security: readSecurity, request: { params: idDoc }, responses: { 200: jsonOk("User", userDoc), 404: errorResponses[404] } });
registry.registerPath({ method: "patch", path: "/admin/users/{id}", tags: ["Users"], summary: "Change name, role or status", description: "You cannot change your own role or status, and the last active super administrator is protected. Disabling or changing the role signs the user out.", ...sec, request: { params: idDoc, body: jsonBody(userUpdateBody) }, responses: { 200: jsonOk("Updated", userDoc), 409: errorResponses[409] } });
registry.registerPath({ method: "post", path: "/admin/users/{id}/reset-password", tags: ["Users"], summary: "Set a new password for a user", description: "Signs the user out everywhere.", ...sec, request: { params: idDoc, body: jsonBody(userResetPasswordBody) }, responses: { 200: jsonOk("Password reset", z.null()), 400: errorResponses[400] } });
registry.registerPath({ method: "delete", path: "/admin/users/{id}", tags: ["Users"], summary: "Delete an administrator", ...sec, request: { params: idDoc }, responses: { 204: { description: "Deleted" }, 409: errorResponses[409] } });

export const usersRouter = Router();
usersRouter.use(superAdmin);
usersRouter.get("/", validate({ query: userListQuery }), async (req, res) => {
  const { items, meta } = await usersService.list(req.query as never);
  return paginated(res, items, meta);
});
usersRouter.post("/", validate({ body: userCreateBody }), async (req, res) => created(res, await usersService.create(req.auth!, req.body), "User created"));
usersRouter.get("/:id", validate({ params: userParams }), async (req, res) => ok(res, await usersService.get(String(req.params.id))));
usersRouter.patch("/:id", validate({ params: userParams, body: userUpdateBody }), async (req, res) => ok(res, await usersService.update(req.auth!, String(req.params.id), req.body), "User updated"));
usersRouter.post("/:id/reset-password", validate({ params: userParams, body: userResetPasswordBody }), async (req, res) => {
  await usersService.resetPassword(req.auth!, String(req.params.id), (req.body as { newPassword: string }).newPassword);
  return ok(res, null, "Password reset. The user was signed out everywhere");
});
usersRouter.delete("/:id", validate({ params: userParams }), async (req, res) => {
  await usersService.remove(req.auth!, String(req.params.id));
  return noContent(res);
});

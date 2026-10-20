import { contactMessageBody, cuidParams, messageList, messageUpdateBody, type MessageStatus } from "@portfolio/validation";
import { Router } from "express";
import { z } from "zod";
import type { Actor } from "../../common/crud/types.js";
import { Errors } from "../../common/errors/app-error.js";
import { jsonBody, jsonOk, pagedOk, readSecurity, writeSecurity } from "../../common/openapi.js";
import { noContent, ok, paginated } from "../../common/responses/response.js";
import { pageArgs, pageMeta } from "../../common/pagination/pagination.js";
import { hashIp } from "../../common/utils/crypto.js";
import { prisma } from "../../config/database.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { editor, superAdmin, viewer } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { audit } from "../audit-logs/audit.service.js";
import { readSingleton } from "../profile/singletons.module.js";

const toDto = (m: { id: string; name: string; email: string; subject: string | null; message: string; status: string; createdAt: Date; readAt: Date | null }) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  subject: m.subject,
  message: m.message,
  status: m.status,
  createdAt: m.createdAt.toISOString(),
  readAt: m.readAt?.toISOString() ?? null,
});

export const messagesService = {
  async list(query: z.infer<typeof messageList>) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }, { subject: { contains: query.q } }, { message: { contains: query.q } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: query.order === "asc" ? "asc" : "desc" }, ...pageArgs(query) }),
      prisma.contactMessage.count({ where }),
    ]);
    return { items: rows.map(toDto), meta: pageMeta(query, total) };
  },

  async get(id: string) {
    const row = await prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw Errors.notFound("Message");
    return toDto(row);
  },

  async setStatus(actor: Actor, id: string, status: MessageStatus) {
    await this.get(id);
    const row = await prisma.contactMessage.update({ where: { id }, data: { status, readAt: status === "NEW" ? null : new Date() } });
    await audit(actor, { action: `message.${status.toLowerCase()}`, entityType: "ContactMessage", entityId: id });
    return toDto(row);
  },

  async remove(actor: Actor, id: string) {
    await this.get(id);
    await prisma.contactMessage.delete({ where: { id } });
    // The audit entry records that a message was deleted, never its content.
    await audit(actor, { action: "message.deleted", entityType: "ContactMessage", entityId: id });
  },

  /** Public contact form. Returns normally for spam so bots learn nothing. */
  async submit(input: z.infer<typeof contactMessageBody>, ip: string) {
    if (input.website) return; // honeypot: humans never fill this field
    const settings = await readSingleton<{ enableContactForm: boolean }>("contactSettings", false);
    if (!settings?.enableContactForm) throw Errors.forbidden("The contact form is not available right now");

    const recent = await prisma.contactMessage.findFirst({
      where: { email: input.email, message: input.message, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
      select: { id: true },
    });
    if (recent) return; // identical message a moment ago: treat as a double submit

    await prisma.contactMessage.create({
      data: { name: input.name, email: input.email, subject: input.subject?.trim() || null, message: input.message, ipHash: hashIp(ip) },
    });
  },
};

const messageDoc = z.object({ id: z.string(), name: z.string(), email: z.string(), subject: z.string().nullable(), message: z.string(), status: z.enum(["NEW", "READ", "ARCHIVED"]), createdAt: z.string(), readAt: z.string().nullable() });
const idDoc = z.object({ id: z.string().describe("Message id") });

registry.registerPath({ method: "get", path: "/admin/messages", tags: ["Messages"], summary: "List contact messages", security: readSecurity, request: { query: messageList as z.ZodObject }, responses: { 200: pagedOk("Messages", messageDoc), 401: errorResponses[401] } });
registry.registerPath({ method: "get", path: "/admin/messages/{id}", tags: ["Messages"], summary: "Get a message", security: readSecurity, request: { params: idDoc }, responses: { 200: jsonOk("Message", messageDoc), 404: errorResponses[404] } });
registry.registerPath({ method: "patch", path: "/admin/messages/{id}", tags: ["Messages"], summary: "Mark as new, read or archived", security: writeSecurity, request: { params: idDoc, body: jsonBody(messageUpdateBody) }, responses: { 200: jsonOk("Updated", messageDoc), 404: errorResponses[404] } });
registry.registerPath({ method: "delete", path: "/admin/messages/{id}", tags: ["Messages"], summary: "Delete a message", description: "SUPER_ADMIN only.", security: writeSecurity, request: { params: idDoc }, responses: { 204: { description: "Deleted" }, 403: errorResponses[403], 404: errorResponses[404] } });

export const messagesRouter = Router();
messagesRouter.get("/", viewer, validate({ query: messageList }), async (req, res) => {
  const { items, meta } = await messagesService.list(req.query as never);
  return paginated(res, items, meta);
});
messagesRouter.get("/:id", viewer, validate({ params: cuidParams }), async (req, res) => ok(res, await messagesService.get(String(req.params.id))));
messagesRouter.patch("/:id", editor, validate({ params: cuidParams, body: messageUpdateBody }), async (req, res) =>
  ok(res, await messagesService.setStatus(req.auth!, String(req.params.id), (req.body as { status: MessageStatus }).status), "Message updated"),
);
messagesRouter.delete("/:id", superAdmin, validate({ params: cuidParams }), async (req, res) => {
  await messagesService.remove(req.auth!, String(req.params.id));
  return noContent(res);
});

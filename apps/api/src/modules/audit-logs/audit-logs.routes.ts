import { Router } from "express";
import { z } from "zod";
import { auditLogList } from "@portfolio/validation";
import { pagedOk, readSecurity } from "../../common/openapi.js";
import { paginated } from "../../common/responses/response.js";
import { pageArgs, pageMeta } from "../../common/pagination/pagination.js";
import { prisma } from "../../config/database.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { superAdmin } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";

const auditDoc = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string().openapi({ example: "project.published" }),
  entityType: z.string(),
  entityId: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
});

registry.registerPath({
  method: "get",
  path: "/admin/audit-logs",
  tags: ["Audit logs"],
  summary: "List audit log entries",
  description: "SUPER_ADMIN only. Newest first. Entries never contain passwords, tokens or message content.",
  security: readSecurity,
  request: { query: auditLogList as z.ZodObject },
  responses: { 200: pagedOk("Audit entries", auditDoc), 403: errorResponses[403] },
});

export const auditLogsRouter = Router();

auditLogsRouter.get("/", superAdmin, validate({ query: auditLogList }), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof auditLogList>;
  const where = {
    ...(q.entityType ? { entityType: q.entityType } : {}),
    ...(q.entityId ? { entityId: q.entityId } : {}),
    ...(q.actorId ? { actorId: q.actorId } : {}),
    ...(q.action ? { action: { contains: q.action } } : {}),
    ...(q.q ? { OR: [{ action: { contains: q.q } }, { entityType: { contains: q.q } }, { actorEmail: { contains: q.q } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: q.order === "asc" ? "asc" : "desc" }, ...pageArgs(q) }),
    prisma.auditLog.count({ where }),
  ]);
  return paginated(
    res,
    rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    pageMeta(q, total),
  );
});

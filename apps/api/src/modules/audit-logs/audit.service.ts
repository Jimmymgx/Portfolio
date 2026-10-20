import type { Request } from "express";
import { prisma, type Tx } from "../../config/database.js";
import { logger } from "../../common/logger.js";
import { stripSecrets } from "../../common/utils/text.js";

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: unknown;
}

type Actor = { userId: string; email: string } | null | undefined;

/** Writes an audit row. Never throws: a logging failure must not fail the user's action. */
export async function audit(actor: Actor, entry: AuditEntry, db: Tx | typeof prisma = prisma): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: actor?.userId ?? null,
        actorEmail: actor?.email ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId == null ? null : String(entry.entityId),
        metadata: entry.metadata === undefined ? undefined : (stripSecrets(entry.metadata) as object),
      },
    });
  } catch (err) {
    logger.warn({ err, action: entry.action }, "Failed to write audit log");
  }
}

export const actorOf = (req: Request): Actor => (req.auth ? { userId: req.auth.userId, email: req.auth.email } : null);

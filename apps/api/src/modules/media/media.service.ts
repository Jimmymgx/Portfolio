import type { ListQuery } from "@portfolio/validation";
import { prisma } from "../../config/database.js";
import { Errors } from "../../common/errors/app-error.js";
import { orderBy, pageArgs, pageMeta } from "../../common/pagination/pagination.js";
import { getStorage } from "../../common/storage/storage.js";
import { randomToken, sha256Bytes } from "../../common/utils/crypto.js";
import { logger } from "../../common/logger.js";
import type { Actor } from "../../common/crud/types.js";
import { revalidateWebsite } from "../../services/revalidation.service.js";
import { audit } from "../audit-logs/audit.service.js";
import { USAGE_RELATIONS, toMediaDto, usageCountSelect, type UsageRelation } from "./media.mapper.js";
import { inspectUpload, sanitizeDisplayName } from "./upload-validation.js";

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
}

function newKey(ext: string) {
  const now = new Date();
  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomToken(16)}.${ext}`;
}

async function usage(id: number) {
  const row = await prisma.media.findUnique({ where: { id }, select: { _count: { select: usageCountSelect } } });
  if (!row) throw Errors.notFound("Media");
  return (Object.entries(row._count) as [UsageRelation, number][])
    .filter(([, n]) => n > 0)
    .map(([relation, count]) => ({ usedAs: USAGE_RELATIONS[relation], count }));
}

export const mediaService = {
  usage,

  async list(query: ListQuery & { kind?: "IMAGE" | "VIDEO" | "DOCUMENT"; unused?: boolean }) {
    const unusedWhere = query.unused
      ? { AND: (Object.keys(USAGE_RELATIONS) as UsageRelation[]).map((r) => ({ [r]: { none: {} } })) }
      : {};
    const where = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.q ? { OR: [{ originalName: { contains: query.q } }, { title: { contains: query.q } }, { altText: { contains: query.q } }] } : {}),
      ...unusedWhere,
    };
    const [rows, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: orderBy(query, ["createdAt", "originalName", "fileSize"] as const, { field: "createdAt", order: "desc" }),
        ...pageArgs(query),
        include: { _count: { select: usageCountSelect } },
      }),
      prisma.media.count({ where }),
    ]);
    return { items: rows.map(toMediaDto), meta: pageMeta(query, total) };
  },

  async get(id: number) {
    const row = await prisma.media.findUnique({ where: { id }, include: { _count: { select: usageCountSelect } } });
    if (!row) throw Errors.notFound("Media");
    return toMediaDto(row);
  },

  async upload(actor: Actor, file: UploadedFile) {
    const info = await inspectUpload(file.buffer, file.originalname);
    const checksum = sha256Bytes(file.buffer);

    // Same bytes uploaded twice: reuse the first copy instead of storing a duplicate.
    const existing = await prisma.media.findFirst({ where: { checksum, kind: info.kind } });
    if (existing) return { media: await this.get(existing.id), duplicate: true };

    const storage = getStorage();
    const key = newKey(info.ext);
    await storage.put(key, file.buffer, info.mime);
    try {
      const row = await prisma.media.create({
        data: {
          originalName: sanitizeDisplayName(file.originalname),
          storageKey: key,
          publicUrl: storage.urlFor(key),
          mimeType: info.mime,
          kind: info.kind,
          fileSize: file.buffer.length,
          width: info.width,
          height: info.height,
          checksum,
          storageProvider: storage.name,
          uploadedById: actor.userId,
        },
      });
      await audit(actor, { action: "media.uploaded", entityType: "Media", entityId: row.id, metadata: { kind: info.kind, size: row.fileSize } });
      return { media: toMediaDto({ ...row, _count: {} }), duplicate: false };
    } catch (err) {
      // Do not leave an orphaned file behind if the database write fails.
      await storage.remove(key).catch(() => undefined);
      throw err;
    }
  },

  async updateMeta(actor: Actor, id: number, data: { title?: string | null; altText?: string | null; altTextAr?: string | null }) {
    await this.get(id);
    const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v]));
    await prisma.media.update({ where: { id }, data: clean });
    await audit(actor, { action: "media.updated", entityType: "Media", entityId: id, metadata: { fields: Object.keys(data) } });
    void revalidateWebsite();
    return this.get(id);
  },

  /** Replaces the file behind a media record. Every place that uses it keeps working and shows the new file. */
  async replace(actor: Actor, id: number, file: UploadedFile) {
    const current = await prisma.media.findUnique({ where: { id } });
    if (!current) throw Errors.notFound("Media");
    const info = await inspectUpload(file.buffer, file.originalname);
    if (info.kind !== current.kind) throw Errors.upload(`Choose a ${current.kind.toLowerCase()} file to replace this ${current.kind.toLowerCase()}`);

    const storage = getStorage();
    const key = newKey(info.ext);
    await storage.put(key, file.buffer, info.mime);
    try {
      await prisma.media.update({
        where: { id },
        data: {
          storageKey: key,
          publicUrl: storage.urlFor(key),
          mimeType: info.mime,
          fileSize: file.buffer.length,
          width: info.width,
          height: info.height,
          checksum: sha256Bytes(file.buffer),
          storageProvider: storage.name,
          originalName: sanitizeDisplayName(file.originalname),
        },
      });
    } catch (err) {
      await storage.remove(key).catch(() => undefined);
      throw err;
    }
    await storage.remove(current.storageKey).catch((err) => logger.warn({ err, key: current.storageKey }, "Old media file could not be removed"));
    await audit(actor, { action: "media.replaced", entityType: "Media", entityId: id });
    void revalidateWebsite();
    return this.get(id);
  },

  async remove(actor: Actor, id: number) {
    const current = await prisma.media.findUnique({ where: { id } });
    if (!current) throw Errors.notFound("Media");
    const used = await usage(id);
    if (used.length > 0) {
      throw Errors.conflict("This file is still in use. Remove it from the content that uses it first", used);
    }
    await prisma.media.delete({ where: { id } });
    await getStorage().remove(current.storageKey).catch((err) => logger.warn({ err, key: current.storageKey }, "Media file could not be removed from storage"));
    await audit(actor, { action: "media.deleted", entityType: "Media", entityId: id });
  },
};


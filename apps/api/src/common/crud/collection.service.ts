import type { PageMeta } from "@portfolio/types";
import type { z, ZodType } from "zod";
import type { ListQuery, PublishStatus } from "@portfolio/validation";
import { prisma, type Tx } from "../../config/database.js";
import { audit } from "../../modules/audit-logs/audit.service.js";
import { revalidateWebsite } from "../../services/revalidation.service.js";
import { Errors } from "../errors/app-error.js";
import { pageMeta } from "../pagination/pagination.js";
import type { CollectionRepository } from "./collection.repository.js";
import type { Actor } from "./types.js";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface CollectionServiceConfig<Dto, Create, Update> {
  /** Human name used in messages, for example "Skill". */
  entity: string;
  /** Prefix of audit actions, for example "skill" gives skill.created. */
  auditType: string;
  repo: CollectionRepository;
  toDto: (row: Row) => Dto;
  /** Translates validated list filters into a Prisma `where`. */
  buildWhere?: (query: any) => Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Validated input to Prisma create data. May look things up (slugs, relations). */
  buildCreate: (input: Create, ctx: { nextSort: number }) => Promise<Record<string, unknown>> | Record<string, unknown>;
  buildUpdate?: (input: Update, current: Row) => Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Scope used to append new rows at the end of the right group (for example one project). */
  sortScope?: (input: Create) => Record<string, unknown>;
  /** The model has a `status` column with DRAFT / PUBLISHED / UNPUBLISHED. */
  publishable?: boolean;
  /** The model also has a `publishedAt` column. */
  hasPublishedAt?: boolean;
  /** Runs inside the write transaction. Used to sync many-to-many relations. */
  afterWrite?: (tx: Tx, row: Row, input: Create | Update) => Promise<void>;
  /** Throw to block deletion with a friendly message. */
  beforeDelete?: (row: Row) => Promise<void>;
  /** Skip website cache invalidation (for non-public data). */
  skipRevalidate?: boolean;
  /** The model has an `updatedById` column: record who last changed each row. */
  trackEditor?: boolean;
  /** Adds computed fields to DTOs after they are built (for example the editor's name). */
  decorate?: (rows: Row[], dtos: Dto[]) => Promise<void>;
}

export class CollectionService<Dto, Create = Record<string, unknown>, Update = Record<string, unknown>> {
  constructor(private readonly c: CollectionServiceConfig<Dto, Create, Update>) {}

  private touch() {
    if (!this.c.skipRevalidate) void revalidateWebsite();
  }

  async list(query: ListQuery & Record<string, unknown>): Promise<{ items: Dto[]; meta: PageMeta }> {
    const where = this.c.buildWhere?.(query) ?? {};
    const { items, total } = await this.c.repo.list(query, where);
    const dtos = items.map(this.c.toDto);
    await this.c.decorate?.(items, dtos);
    return { items: dtos, meta: pageMeta(query, total) };
  }

  async get(id: number): Promise<Dto> {
    const row = await this.c.repo.get(id, this.c.entity);
    const dto = this.c.toDto(row);
    await this.c.decorate?.([row], [dto]);
    return dto;
  }

  private async finish(row: Row): Promise<Dto> {
    const dto = this.c.toDto(row);
    await this.c.decorate?.([row], [dto]);
    return dto;
  }

  async create(actor: Actor, input: Create): Promise<Dto> {
    const scope = this.c.sortScope?.(input) ?? {};
    const nextSort = await this.c.repo.nextSortOrder(scope);
    const data = await this.c.buildCreate(input, { nextSort });
    if (this.c.trackEditor) data.updatedById = actor.userId;
    const row = await prisma.$transaction(async (tx) => {
      const created = await this.c.repo.create(data, tx);
      if (this.c.afterWrite) await this.c.afterWrite(tx, created, input);
      return this.c.repo.get(created.id, this.c.entity, tx);
    });
    await audit(actor, { action: `${this.c.auditType}.created`, entityType: this.c.entity, entityId: row.id });
    this.touch();
    return this.finish(row);
  }

  async update(actor: Actor, id: number, input: Update): Promise<Dto> {
    const current = await this.c.repo.get(id, this.c.entity);
    const data = this.c.buildUpdate ? await this.c.buildUpdate(input, current) : (input as Record<string, unknown>);
    if (this.c.trackEditor) data.updatedById = actor.userId;
    const row = await prisma.$transaction(async (tx) => {
      await this.c.repo.update(id, data, tx);
      if (this.c.afterWrite) await this.c.afterWrite(tx, current, input);
      return this.c.repo.get(id, this.c.entity, tx);
    });
    await audit(actor, { action: `${this.c.auditType}.updated`, entityType: this.c.entity, entityId: id, metadata: { fields: Object.keys(input as object) } });
    this.touch();
    return this.finish(row);
  }

  async remove(actor: Actor, id: number): Promise<void> {
    const current = await this.c.repo.get(id, this.c.entity);
    if (this.c.beforeDelete) await this.c.beforeDelete(current);
    await this.c.repo.remove(id);
    await audit(actor, { action: `${this.c.auditType}.deleted`, entityType: this.c.entity, entityId: id });
    this.touch();
  }

  async reorder(actor: Actor, ids: number[]): Promise<void> {
    await this.c.repo.reorder(ids);
    await audit(actor, { action: `${this.c.auditType}.reordered`, entityType: this.c.entity, metadata: { count: ids.length } });
    this.touch();
  }

  async setStatus(actor: Actor, id: number, status: PublishStatus): Promise<Dto> {
    if (!this.c.publishable) throw Errors.conflict(`${this.c.entity} does not have a publishing status`);
    const current = await this.c.repo.get(id, this.c.entity);
    const data: Record<string, unknown> = { status };
    if (this.c.trackEditor) data.updatedById = actor.userId;
    if (this.c.hasPublishedAt && status === "PUBLISHED" && !current.publishedAt) data.publishedAt = new Date();
    const row = await this.c.repo.update(id, data);
    const action = status === "PUBLISHED" ? "published" : status === "UNPUBLISHED" ? "unpublished" : "set_to_draft";
    await audit(actor, { action: `${this.c.auditType}.${action}`, entityType: this.c.entity, entityId: id });
    this.touch();
    return this.finish(row);
  }
}

/**
 * Creates a service whose create/update input types come from the shared Zod schemas,
 * so every hook (`buildCreate`, `buildUpdate`, `afterWrite`) is fully typed.
 */
export function defineCollection<C extends ZodType, U extends ZodType, Dto>(
  _schemas: { create: C; update: U },
  config: CollectionServiceConfig<Dto, z.infer<C>, z.infer<U>>,
) {
  return new CollectionService<Dto, z.infer<C>, z.infer<U>>(config);
}

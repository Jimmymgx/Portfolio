import type { ListQuery } from "@portfolio/validation";
import { prisma } from "../../config/database.js";
import { Errors } from "../errors/app-error.js";
import { orderBy as buildOrderBy, pageArgs } from "../pagination/pagination.js";
import type { DbLike, DelegateFor } from "./types.js";

export interface RepositoryOptions {
  /** Prisma `include` used for every read (relations needed by the mapper). */
  include?: Record<string, unknown>;
  /** String columns searched by `?q=`. */
  searchFields: string[];
  /** Columns the client may sort by. */
  sortable: readonly string[];
  defaultOrder: { field: string; order: "asc" | "desc" };
}

/** The only layer that talks to Prisma for a collection. Services and controllers never see Prisma. */
export class CollectionRepository {
  constructor(
    private readonly delegateFor: DelegateFor,
    private readonly opts: RepositoryOptions,
  ) {}

  private d(db?: DbLike) {
    return this.delegateFor(db ?? prisma);
  }

  async list(query: ListQuery, where: Record<string, unknown> = {}, extraOrder?: Record<string, "asc" | "desc">[]) {
    const search = query.q ? { OR: this.opts.searchFields.map((f) => ({ [f]: { contains: query.q } })) } : {};
    const finalWhere = { AND: [where, search] };
    const order = [...buildOrderBy(query, this.opts.sortable, this.opts.defaultOrder), ...(extraOrder ?? [])];
    const [items, total] = await Promise.all([
      this.d().findMany({ where: finalWhere, orderBy: order, ...pageArgs(query), ...(this.opts.include ? { include: this.opts.include } : {}) }),
      this.d().count({ where: finalWhere }),
    ]);
    return { items, total };
  }

  async all(where: Record<string, unknown> = {}, orderBy?: unknown, db?: DbLike) {
    return this.d(db).findMany({ where, orderBy: orderBy ?? [{ sortOrder: "asc" }, { id: "asc" }], ...(this.opts.include ? { include: this.opts.include } : {}) });
  }

  async find(id: number, db?: DbLike) {
    return this.d(db).findUnique({ where: { id }, ...(this.opts.include ? { include: this.opts.include } : {}) });
  }

  async get(id: number, entity: string, db?: DbLike) {
    const row = await this.find(id, db);
    if (!row) throw Errors.notFound(entity);
    return row;
  }

  findFirst(where: Record<string, unknown>, db?: DbLike) {
    return this.d(db).findFirst({ where });
  }

  create(data: Record<string, unknown>, db?: DbLike) {
    return this.d(db).create({ data, ...(this.opts.include ? { include: this.opts.include } : {}) });
  }

  update(id: number, data: Record<string, unknown>, db?: DbLike) {
    return this.d(db).update({ where: { id }, data, ...(this.opts.include ? { include: this.opts.include } : {}) });
  }

  remove(id: number, db?: DbLike) {
    return this.d(db).delete({ where: { id } });
  }

  count(where: Record<string, unknown> = {}, db?: DbLike) {
    return this.d(db).count({ where });
  }

  /** Next free sort position within an optional scope (for example one category). */
  async nextSortOrder(where: Record<string, unknown> = {}, db?: DbLike): Promise<number> {
    const agg = await this.d(db).aggregate({ where, _max: { sortOrder: true } });
    return (agg._max.sortOrder ?? -1) + 1;
  }

  /**
   * Reassigns the existing sort slots of the given rows to the new order.
   * Works for a full list or a filtered subset without disturbing rows that are not part of the request.
   */
  async reorder(ids: number[]) {
    await prisma.$transaction(async (tx) => {
      const d = this.delegateFor(tx);
      const rows: { id: number; sortOrder: number }[] = await d.findMany({ where: { id: { in: ids } }, select: { id: true, sortOrder: true } });
      if (rows.length !== ids.length) throw Errors.notFound("One or more items");
      let slots = rows.map((r) => r.sortOrder).sort((a, b) => a - b);
      if (new Set(slots).size !== slots.length) slots = ids.map((_, i) => i + Math.min(...slots));
      for (let i = 0; i < ids.length; i++) {
        await d.update({ where: { id: ids[i] }, data: { sortOrder: slots[i] } });
      }
    });
  }
}

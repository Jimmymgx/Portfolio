import type { PageMeta } from "@portfolio/types";
import type { ListQuery } from "@portfolio/validation";

export function pageArgs(q: Pick<ListQuery, "page" | "pageSize">) {
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}

export function pageMeta(q: Pick<ListQuery, "page" | "pageSize">, total: number): PageMeta {
  return { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

/** Builds an `orderBy` from a client-supplied field, restricted to a whitelist. */
export function orderBy<T extends string>(
  q: Pick<ListQuery, "sort" | "order">,
  allowed: readonly T[],
  fallback: { field: T; order: "asc" | "desc" },
) {
  const field = (allowed as readonly string[]).includes(q.sort ?? "") ? (q.sort as T) : fallback.field;
  const order = q.sort ? q.order : fallback.order;
  return [{ [field]: order } as Record<T, "asc" | "desc">];
}

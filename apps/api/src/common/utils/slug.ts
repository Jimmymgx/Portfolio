import { randomBytes } from "node:crypto";
import type { Delegate } from "../crud/types.js";
import { slugify, uniqueSlug } from "./text.js";

/** Builds a slug that is unique within one table. Uses the supplied slug if given, otherwise derives it from `source`. */
export async function makeUniqueSlug(delegate: Delegate, source: string, provided?: string | null, ignoreId?: number): Promise<string> {
  const base = provided ? provided : slugify(source, `item-${randomBytes(2).toString("hex")}`);
  return uniqueSlug(base, async (candidate) => {
    const hit = await delegate.findFirst({ where: { slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) }, select: { id: true } });
    return !!hit;
  });
}

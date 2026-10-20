/** Plain JSON-safe copy of a database row (Dates become ISO strings). */
export function plain<T extends object>(row: T): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return JSON.parse(JSON.stringify(row));
}

/** `@db.Date` column to `YYYY-MM-DD`. */
export function dateOut(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** `YYYY-MM-DD` (or empty) to a Date at UTC midnight, or null. */
export function dateIn(v: string | null | undefined): Date | null {
  return v ? new Date(`${v}T00:00:00.000Z`) : null;
}

/** Removes keys whose value is `undefined`, so partial updates never overwrite columns with nothing. */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Copy of `obj` without the listed keys. */
export function omit<T extends Record<string, unknown>, K extends string>(obj: T, ...keys: K[]): Omit<T, K> {
  const out: Record<string, unknown> = { ...obj };
  for (const k of keys) delete out[k];
  return out as Omit<T, K>;
}

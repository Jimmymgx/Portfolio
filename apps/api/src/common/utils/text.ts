/** Converts empty or whitespace-only strings to null so optional columns stay clean. */
export function emptyToNull<T>(value: T): T | null {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

/** Applies `emptyToNull` to every string value of an object. Non-string values are kept as they are. */
export function cleanStrings<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) out[k] = typeof v === "string" ? emptyToNull(v) : v;
  return out as T;
}

/** URL-safe slug. Arabic and other non-Latin letters are dropped, so callers must provide a fallback. */
export function slugify(input: string, fallback = "item"): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return s || fallback;
}

/** Returns `value` with a numeric suffix until `exists` says it is free. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  for (let n = 2; await exists(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}

/** Keys that must never be stored in audit metadata or logs. */
const SECRET_KEY = /pass(word)?|token|secret|hash|cookie|authorization/i;

export function stripSecrets(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => stripSecrets(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? "[removed]" : stripSecrets(v, depth + 1);
  }
  return out;
}

import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { PORTFOLIO_TAG } from "@/lib/api";

const ALLOWED_TAGS = new Set([PORTFOLIO_TAG]);

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the API after content is published. It drops the website's cached content so the next visit shows the change.
 * Protected by a shared secret (REVALIDATE_SECRET) and limited to a fixed list of tags.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) return NextResponse.json({ revalidated: false, error: "Not configured" }, { status: 503 });

  const given = req.headers.get("x-revalidate-secret") ?? "";
  if (!sameSecret(given, expected)) return NextResponse.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });

  let tags: string[] = [PORTFOLIO_TAG];
  try {
    const body = (await req.json()) as { tags?: unknown };
    if (Array.isArray(body.tags)) tags = body.tags.filter((t): t is string => typeof t === "string");
  } catch {
    /* no body: refresh the default tag */
  }

  const done = tags.filter((t) => ALLOWED_TAGS.has(t));
  for (const tag of done) revalidateTag(tag);
  return NextResponse.json({ revalidated: done.length > 0, tags: done });
}

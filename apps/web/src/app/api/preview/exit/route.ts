import { cookies, draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/site-model";

/** Leaves preview mode and returns to the public site. */
export async function GET(req: NextRequest) {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);
  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

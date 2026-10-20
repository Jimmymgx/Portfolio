import { cookies, draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { verifyPreviewToken } from "@/lib/api";
import { PREVIEW_COOKIE } from "@/lib/site-model";

/**
 * Starts a draft preview. The CMS creates a short-lived signed link; the API confirms it is genuine,
 * then this route turns on Next draft mode and keeps the token in an HttpOnly cookie for the pages to use.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const rawPath = req.nextUrl.searchParams.get("path") ?? "/";
  // Only same-site paths: never redirect to another host.
  const path = rawPath.startsWith("/") && !rawPath.startsWith("//") ? rawPath : "/";

  if (!token || !(await verifyPreviewToken(token))) {
    return new NextResponse("This preview link is invalid or has expired. Create a new one from the CMS.", { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 60,
  });
  const res = NextResponse.redirect(new URL(path, req.nextUrl.origin));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

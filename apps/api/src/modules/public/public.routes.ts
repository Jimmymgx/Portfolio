import { Router, type Request, type RequestHandler } from "express";
import { z } from "zod";
import { contactMessageBody, publicQuery, slugParams, type Lang } from "@portfolio/validation";
import { jsonBody, jsonOk } from "../../common/openapi.js";
import { created, ok } from "../../common/responses/response.js";
import { verifyToken } from "../../common/utils/crypto.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { contactLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { messagesService } from "../messages/messages.module.js";
import { publicService, type Ctx } from "./public.service.js";

export const publicRouter = Router();

function isPreview(req: Request): boolean {
  const token = req.get("x-preview-token");
  if (!token) return false;
  const data = verifyToken<{ scope?: string }>(token);
  return data?.scope === "preview";
}

const ctxOf = (req: Request): Ctx => ({ lang: (req.query as unknown as { lang: Lang }).lang, preview: isPreview(req) });

/** Published content may be cached briefly by a CDN. Previews are never cached. */
const cacheHeaders: RequestHandler = (req, res, next) => {
  res.set("Cache-Control", isPreview(req) ? "no-store" : "public, max-age=0, s-maxage=30, stale-while-revalidate=120");
  res.set("Vary", "X-Preview-Token");
  next();
};

publicRouter.use(cacheHeaders);

const previewHeader = z.object({ "x-preview-token": z.string().optional().describe("Signed preview token. Shows drafts when valid.") });

interface Endpoint {
  path: string;
  summary: string;
  handler: (ctx: Ctx, req: Request) => Promise<unknown>;
}

const endpoints: Endpoint[] = [
  { path: "site", summary: "Site name, description, branding and footer", handler: (c) => publicService.site(c) },
  { path: "profile", summary: "Name, title, biography and contact details", handler: (c) => publicService.profile(c) },
  { path: "hero", summary: "Hero text, buttons and media", handler: (c) => publicService.hero(c) },
  { path: "about", summary: "About section and quick facts", handler: (c) => publicService.about(c) },
  { path: "skills", summary: "Skill categories with their skills", handler: (c) => publicService.skills(c) },
  { path: "projects", summary: "Published projects in display order", handler: (c) => publicService.projects(c) },
  { path: "experience", summary: "Work experience, newest first", handler: (c) => publicService.experience(c) },
  { path: "education", summary: "Education, newest first", handler: (c) => publicService.education(c) },
  { path: "certifications", summary: "Certifications", handler: (c) => publicService.certifications(c) },
  { path: "achievements", summary: "Achievements", handler: (c) => publicService.achievements(c) },
  { path: "social-links", summary: "Social and professional links", handler: (c) => publicService.socialLinks(c) },
  { path: "navigation", summary: "Navigation links", handler: (c) => publicService.navigation(c) },
  { path: "sections", summary: "Enabled sections in display order", handler: (c) => publicService.sections(c) },
  { path: "contact", summary: "Contact heading and the channels the owner made public", handler: (c) => publicService.contact(c) },
  { path: "seo", summary: "SEO metadata for the home page", handler: (c) => publicService.seo(c) },
  { path: "portfolio", summary: "Everything the home page needs in one request", handler: (c) => publicService.portfolio(c) },
];

for (const e of endpoints) {
  registry.registerPath({
    method: "get",
    path: `/public/${e.path}`,
    tags: ["Public"],
    summary: e.summary,
    description: "Published content only. Add `lang=ar` for Arabic (English is used where Arabic is empty).",
    request: { query: publicQuery as z.ZodObject, headers: previewHeader },
    responses: { 200: jsonOk(e.summary, z.unknown()) },
  });
  publicRouter.get(`/${e.path}`, validate({ query: publicQuery }), async (req, res) => ok(res, await e.handler(ctxOf(req), req)));
}

registry.registerPath({
  method: "get",
  path: "/public/projects/{slug}",
  tags: ["Public"],
  summary: "One published project by slug",
  request: { params: slugParams as z.ZodObject, query: publicQuery as z.ZodObject, headers: previewHeader },
  responses: { 200: jsonOk("Project", z.unknown()), 404: errorResponses[404] },
});
publicRouter.get("/projects/:slug", validate({ params: slugParams, query: publicQuery }), async (req, res) =>
  ok(res, await publicService.project(ctxOf(req), String(req.params.slug))),
);

registry.registerPath({
  method: "post",
  path: "/public/contact/messages",
  tags: ["Public", "Contact"],
  summary: "Send a message through the contact form",
  description: "Works only when the contact form is enabled in the CMS. Limited to 5 messages per hour per visitor. The `website` field is a honeypot and must stay empty.",
  request: { body: jsonBody(contactMessageBody) },
  responses: { 201: jsonOk("Received", z.null()), 400: errorResponses[400], 403: errorResponses[403], 429: errorResponses[429] },
});
publicRouter.post("/contact/messages", contactLimiter, validate({ body: contactMessageBody }), async (req, res) => {
  await messagesService.submit(req.body, req.ip ?? "unknown");
  return created(res, null, "Thank you. Your message was sent");
});

const verifyBody = z.object({ token: z.string().min(10).max(2000) });
registry.registerPath({
  method: "post",
  path: "/public/preview/verify",
  tags: ["Public"],
  summary: "Check a preview token",
  description: "Used by the website's /api/preview route before it enables draft mode.",
  request: { body: jsonBody(verifyBody) },
  responses: { 200: jsonOk("Result", z.object({ valid: z.boolean() })) },
});
publicRouter.post("/preview/verify", validate({ body: verifyBody }), async (req, res) => {
  const data = verifyToken<{ scope?: string }>((req.body as { token: string }).token);
  return ok(res, { valid: data?.scope === "preview" });
});

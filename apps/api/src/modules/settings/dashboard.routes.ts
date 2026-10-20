import { Router } from "express";
import { z } from "zod";
import { previewTokenBody } from "@portfolio/validation";
import type { AreaStatus, DashboardStats, SetupItem } from "@portfolio/types";
import { jsonBody, jsonOk, readSecurity, writeSecurity } from "../../common/openapi.js";
import { ok } from "../../common/responses/response.js";
import { signToken } from "../../common/utils/crypto.js";
import { env } from "../../config/env.js";
import { absoluteMediaUrl } from "../../common/storage/storage.js";
import { prisma } from "../../config/database.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { editor, viewer } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { audit } from "../audit-logs/audit.service.js";
import { revalidateWebsite } from "../../services/revalidation.service.js";

/** Preview sessions last half an hour. The token only unlocks draft reads on the public API, nothing else. */
const PREVIEW_TTL_SECONDS = 30 * 60;

registry.registerPath({
  method: "get",
  path: "/admin/dashboard",
  tags: ["Settings"],
  summary: "Dashboard overview",
  description: "Real counts from the database, recent activity, recent messages and recently edited projects. No invented metrics.",
  security: readSecurity,
  responses: { 200: jsonOk("Overview", z.record(z.string(), z.unknown())), 401: errorResponses[401] },
});
registry.registerPath({
  method: "get",
  path: "/admin/owner",
  tags: ["Settings"],
  summary: "Site owner identity",
  description: "Name, Arabic name and portrait of the site owner, used to personalise the dashboard.",
  security: readSecurity,
  responses: { 200: jsonOk("Owner", z.record(z.string(), z.unknown())), 401: errorResponses[401] },
});
registry.registerPath({
  method: "post",
  path: "/admin/preview-token",
  tags: ["Settings"],
  summary: "Create a draft preview link",
  description: "Returns a short-lived signed link that lets the website show unpublished drafts. Requires the EDITOR role.",
  security: writeSecurity,
  request: { body: jsonBody(previewTokenBody) },
  responses: { 200: jsonOk("Preview", z.object({ token: z.string(), expiresInSeconds: z.number(), url: z.string() })) },
});
registry.registerPath({
  method: "post",
  path: "/admin/revalidate",
  tags: ["Settings"],
  summary: "Refresh the public website now",
  description: "Asks the website to drop its cached content. Normally this happens automatically after publishing.",
  security: writeSecurity,
  responses: { 200: jsonOk("Requested", z.null()) },
});

export const dashboardRouter = Router();

/** What the owner still has to do before the website is complete, worked out from real data only. */
async function setupItems(): Promise<{ setup: SetupItem[]; areas: AreaStatus[]; lastPublishedAt: string | null }> {
  const [profile, hero, about, contact, site, seo, noDescription, skills, experience, lastPublish] = await Promise.all([
    prisma.profile.findMany({ select: { state: true, biography: true } }),
    prisma.hero.findMany({ select: { state: true } }),
    prisma.about.findMany({ select: { state: true, introduction: true, fullDescription: true } }),
    prisma.contactSettings.findMany({ select: { state: true, enableContactForm: true } }),
    prisma.siteSettings.findMany({ select: { state: true, siteUrl: true } }),
    prisma.seoSettings.findMany({ where: { pageKey: "home" }, select: { state: true, description: true } }),
    prisma.project.count({ where: { status: "PUBLISHED", OR: [{ shortDescription: null }, { shortDescription: "" }] } }),
    prisma.skill.count({ where: { status: "PUBLISHED" } }),
    prisma.experience.count(),
    prisma.auditLog.findFirst({ where: { action: { endsWith: ".published" } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const live = <T extends { state: string }>(rows: T[]) => rows.find((r) => r.state === "PUBLISHED");
  const status = (rows: { state: string }[]): AreaStatus["status"] => (live(rows) ? "LIVE" : rows.length ? "DRAFT" : "EMPTY");
  const profileLive = live(profile);
  const seoLive = live(seo);
  const setup: SetupItem[] = [
    { id: "profile", title: "Publish your profile", hint: "Your biography and short bio are drafts until you approve them.", href: "/profile", done: !!profileLive?.biography },
    { id: "hero", title: "Publish the hero text", hint: "The line under your name on the first screen.", href: "/hero", done: !!live(hero) },
    { id: "about", title: "Write the About section", hint: "Your introduction and philosophy are still empty.", href: "/about", done: !!(live(about)?.introduction || live(about)?.fullDescription) },
    { id: "projects", title: "Add project descriptions", hint: noDescription ? `${noDescription} published project${noDescription === 1 ? " has" : "s have"} no description yet.` : "Every published project has a description.", href: "/projects", done: noDescription === 0 },
    { id: "skills", title: "Add your skills", hint: "Skills appear as the periodic-table grid.", href: "/skills", done: skills > 0 },
    { id: "experience", title: "Add your experience", hint: "The timeline stays empty until you add roles.", href: "/experience", done: experience > 0 },
    { id: "seo", title: "Publish the SEO description", hint: "What search engines show under your site name.", href: "/seo", done: !!seoLive?.description },
    { id: "contact", title: "Turn on the contact form", hint: "Visitors can message you; nothing is emailed.", href: "/contact", done: !!live(contact)?.enableContactForm },
    { id: "domain", title: "Set your website address", hint: "Needed for the sitemap and share previews.", href: "/settings", done: !!live(site)?.siteUrl },
  ];
  const areas: AreaStatus[] = [
    { key: "profile", label: "Profile", href: "/profile", status: status(profile) },
    { key: "hero", label: "Hero", href: "/hero", status: status(hero) },
    { key: "about", label: "About", href: "/about", status: status(about) },
    { key: "contact", label: "Contact", href: "/contact", status: status(contact) },
    { key: "seo", label: "SEO", href: "/seo", status: status(seo) },
    { key: "site", label: "Site settings", href: "/settings", status: status(site) },
  ];
  return { setup, areas, lastPublishedAt: lastPublish?.createdAt.toISOString() ?? null };
}

dashboardRouter.get("/dashboard", viewer, async (_req, res) => {
  const [projTotal, projPublished, projDraft, skills, certifications, achievements, media, newMessages, recentProjects, recentMessages, activity] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "PUBLISHED" } }),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.skill.count(),
    prisma.certification.count(),
    prisma.achievement.count(),
    prisma.media.count(),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, status: true, updatedAt: true } }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, subject: true, status: true, createdAt: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, action: true, entityType: true, entityId: true, actorEmail: true, createdAt: true } }),
  ]);

  const stats: DashboardStats = {
    projects: { total: projTotal, published: projPublished, draft: projDraft },
    skills,
    certifications,
    achievements,
    media,
    newMessages,
  };
  const extra = await setupItems();
  return ok(res, {
    ...extra,
    stats,
    recentProjects: recentProjects.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() })),
    recentMessages: recentMessages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    recentActivity: activity.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

/** Who owns this site: used to personalise the dashboard (name, Arabic name, portrait). Live profile first, draft as a fallback. */
dashboardRouter.get("/owner", viewer, async (_req, res) => {
  const rows = await prisma.profile.findMany({ include: { avatar: true } });
  const p = rows.find((r) => r.state === "PUBLISHED") ?? rows[0];
  return ok(res, {
    fullName: p?.fullName ?? null,
    fullNameAr: p?.fullNameAr ?? null,
    firstName: p?.firstName ?? null,
    firstNameAr: p?.firstNameAr ?? null,
    avatarUrl: absoluteMediaUrl(p?.avatar?.publicUrl),
    avatarAlt: p?.avatar?.altText ?? null,
  });
});

dashboardRouter.post("/preview-token", editor, validate({ body: previewTokenBody }), async (req, res) => {
  const { locale, path } = req.body as { locale: "en" | "ar"; path: string };
  const token = signToken({ scope: "preview", uid: req.auth!.userId }, PREVIEW_TTL_SECONDS);
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const url = `${env.PUBLIC_WEB_URL.replace(/\/$/, "")}/api/preview?token=${encodeURIComponent(token)}&path=${encodeURIComponent(safePath === "/" ? `/${locale}` : safePath)}`;
  await audit(req.auth, { action: "preview.created", entityType: "Preview" });
  return ok(res, { token, expiresInSeconds: PREVIEW_TTL_SECONDS, url }, "Preview link created");
});

dashboardRouter.post("/revalidate", editor, async (req, res) => {
  await revalidateWebsite();
  await audit(req.auth, { action: "site.revalidated", entityType: "Site" });
  return ok(res, null, "The website was asked to refresh");
});

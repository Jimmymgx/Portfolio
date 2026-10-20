/**
 * One-time, idempotent import of the website's current static content (apps/web/src/lib/data.ts) into the database.
 *
 *   pnpm --filter @portfolio/api content:import -- --dry-run     (shows what would happen, writes nothing)
 *   pnpm --filter @portfolio/api content:import                  (writes)
 *
 * Rules
 *  - Never run automatically. The database migration must already be applied.
 *  - Never overwrites: a record that already exists (by slug, state or natural key) is skipped and reported.
 *  - Content with status `confirmed` is imported as PUBLISHED. `awaiting_approval` / `draft` copy goes to the
 *    DRAFT row of singletons, so the owner can review and publish it in the CMS. Unapproved text that belongs to a
 *    collection item (for example a project description) is NOT stored. It is listed in the report instead.
 *  - `missing` and `excluded` content, and everything in sample-data.ts, is never imported.
 *  - Reads only data.ts and files under apps/web/public. Nothing from the project sheet, no credentials.
 *  - Writes content/import-report.md.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/config/database.js";
import { getStorage } from "../src/common/storage/storage.js";
import { randomToken, sha256Bytes } from "../src/common/utils/crypto.js";
import { inspectUpload } from "../src/modules/media/upload-validation.js";
import {
  CONTACT,
  NAV,
  PROFILE,
  PROJECTS,
  PROJECT_KINDS,
  SITE_SETTINGS,
  SOCIAL_LINKS,
  type Copy,
  type ProjectKind,
  type SectionId,
  type SocialKind,
} from "../../web/src/lib/data.js";

const DRY = process.argv.includes("--dry-run");
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const webPublic = path.join(repoRoot, "apps/web/public");

const report: { created: string[]; skipped: string[]; pending: string[]; missing: string[] } = { created: [], skipped: [], pending: [], missing: [] };
const log = (kind: keyof typeof report, line: string) => report[kind].push(line);

/* ───────── helpers ───────── */

const isLive = (c: Copy) => c.status === "confirmed";
const isDraftish = (c: Copy) => c.status === "awaiting_approval" || c.status === "draft";
const hasText = (c: Copy) => !!c.en && c.en.trim() !== "";

/** Returns { en, ar } columns for a copy field, using only text allowed by `allow`. */
function cols(name: string, c: Copy, allow: (c: Copy) => boolean): Record<string, string | null> {
  if (!hasText(c) || !allow(c)) return {};
  return { [name]: c.en, [`${name}Ar`]: c.ar ?? null };
}

async function mediaFrom(rel: string, title: string, alt?: { en: string; ar?: string }): Promise<number | null> {
  const file = path.join(webPublic, rel);
  let buffer: Buffer;
  try {
    buffer = await readFile(file);
  } catch {
    log("missing", `Media file not found: apps/web/public/${rel}`);
    return null;
  }
  const checksum = sha256Bytes(buffer);
  const existing = await prisma.media.findFirst({ where: { checksum } });
  if (existing) {
    log("skipped", `Media ${rel} (already imported as #${existing.id})`);
    return existing.id;
  }
  const info = await inspectUpload(buffer, path.basename(rel));
  if (DRY) {
    log("created", `Media ${rel} (${info.kind}, ${Math.round(buffer.length / 1024)} KB) [dry run]`);
    return null;
  }
  const storage = getStorage();
  const key = `imported/${randomToken(12)}.${info.ext}`;
  await storage.put(key, buffer, info.mime);
  const row = await prisma.media.create({
    data: {
      originalName: path.basename(rel),
      title,
      storageKey: key,
      publicUrl: storage.urlFor(key),
      mimeType: info.mime,
      kind: info.kind,
      fileSize: buffer.length,
      width: info.width,
      height: info.height,
      checksum,
      altText: alt?.en ?? null,
      altTextAr: alt?.ar ?? null,
      storageProvider: storage.name,
    },
  });
  log("created", `Media ${rel} -> #${row.id}`);
  return row.id;
}

/** Creates a singleton row for a state unless one exists. Never overwrites. */
async function singleton(label: string, exists: () => Promise<unknown>, create: () => Promise<unknown>) {
  if (await exists()) return log("skipped", `${label} (row already exists)`);
  if (DRY) return log("created", `${label} [dry run]`);
  await create();
  log("created", label);
}

/* ───────── import ───────── */

async function main() {
  console.log(DRY ? "Dry run: nothing will be written.\n" : "Importing static content...\n");

  // Media (hero video, poster, avatar, social image)
  const poster = await mediaFrom("hero/hero-poster.webp", "Hero poster", { en: "Illustrated avatar", ar: "شخصية رسومية" });
  const mp4 = await mediaFrom("hero/hero.mp4", "Hero video (MP4)");
  const webm = await mediaFrom("hero/hero.webm", "Hero video (WebM)");
  const avatar = await mediaFrom("portrait-bust.webp", "Portrait (illustrated avatar)", { en: "Mohamed Gamal, illustrated avatar", ar: "محمد جمال، شخصية رسومية" });
  const og = await mediaFrom("og.jpg", "Social sharing image");

  // Profile: confirmed copy is published, unapproved copy goes to the draft row.
  const profileBase = (allow: (c: Copy) => boolean) => ({
    ...cols("fullName", PROFILE.fullName, allow),
    ...cols("displayName", PROFILE.displayName, allow),
    ...cols("firstName", PROFILE.firstName, allow),
    initials: PROFILE.initials,
    ...cols("professionalTitle", PROFILE.title, allow),
    ...cols("roleLine", PROFILE.roleLine, allow),
    ...cols("tagline", PROFILE.tagline, allow),
    ...cols("expertise", PROFILE.expertise, allow),
    ...cols("audience", PROFILE.audience, allow),
    ...cols("location", PROFILE.location, allow),
    ...cols("biography", PROFILE.bio, allow),
    ...cols("shortBiography", PROFILE.summary, allow),
    publicEmail: CONTACT.email.status === "confirmed" ? CONTACT.email.value : null,
    avatarMediaId: avatar,
  });
  await singleton("Profile (published)", () => prisma.profile.findFirst({ where: { state: "PUBLISHED" } }), () => prisma.profile.create({ data: ({ state: "PUBLISHED", ...profileBase(isLive) } as never) }));
  const draftWorthy = [PROFILE.bio, PROFILE.summary, PROFILE.intro, ...PROFILE.taglineOptions].filter(isDraftish);
  if (draftWorthy.length) {
    await singleton("Profile (draft with unapproved copy)", () => prisma.profile.findFirst({ where: { state: "DRAFT" } }), () => prisma.profile.create({ data: ({ state: "DRAFT", ...profileBase((c) => isLive(c) || isDraftish(c)) } as never) }));
    log("pending", "Profile biography and short biography are drafts. Review and publish the profile in the CMS.");
    PROFILE.taglineOptions.forEach((t, i) => log("pending", `Tagline option ${i + 1}: "${t.en}"  (choose one and type it in the profile)`));
  }

  // Hero
  const heroBase = (allow: (c: Copy) => boolean) => ({ ...cols("description", PROFILE.intro, allow), audioEnabled: true, videoMp4MediaId: mp4, videoWebmMediaId: webm, posterMediaId: poster });
  await singleton("Hero (published)", () => prisma.hero.findFirst({ where: { state: "PUBLISHED" } }), () => prisma.hero.create({ data: ({ state: "PUBLISHED", ...heroBase(isLive) } as never) }));
  if (isDraftish(PROFILE.intro)) {
    await singleton("Hero (draft with unapproved intro)", () => prisma.hero.findFirst({ where: { state: "DRAFT" } }), () => prisma.hero.create({ data: ({ state: "DRAFT", ...heroBase((c) => isLive(c) || isDraftish(c)) } as never) }));
    log("pending", "Hero intro text is a draft. Review and publish the hero in the CMS.");
  }

  // About (ID card header only; everything else was never provided)
  await singleton(
    "About (published)",
    () => prisma.about.findFirst({ where: { state: "PUBLISHED" } }),
    () => prisma.about.create({ data: { state: "PUBLISHED", showIdCard: true, idCardTitle: PROFILE.idCard.header.en, idCardTitleAr: PROFILE.idCard.header.ar ?? null, idCardPortraitMediaId: avatar } }),
  );
  if (!hasText(PROFILE.philosophy)) log("missing", "About: philosophy / long description were never provided");
  if (!hasText(PROFILE.quote)) log("missing", "About: quote was never provided");

  // Contact + site + SEO
  await singleton(
    "Contact settings (published)",
    () => prisma.contactSettings.findFirst({ where: { state: "PUBLISHED" } }),
    () => prisma.contactSettings.create({ data: { state: "PUBLISHED", publicEmail: CONTACT.email.status === "confirmed" ? CONTACT.email.value : null, showPhone: false, showWhatsapp: false, enableContactForm: false } }),
  );
  log("missing", "Contact: phone and WhatsApp were not provided (hidden)");
  log("pending", "Contact form is off. Turn it on in the CMS if you want visitors to message you.");

  const meta = SITE_SETTINGS.meta;
  await singleton(
    "Site settings (published)",
    () => prisma.siteSettings.findFirst({ where: { state: "PUBLISHED" } }),
    () => prisma.siteSettings.create({ data: { state: "PUBLISHED", siteName: PROFILE.displayName.en, siteNameAr: PROFILE.displayName.ar ?? null, siteUrl: SITE_SETTINGS.siteUrl, primaryLanguage: "EN", maintenanceMode: false } }),
  );
  const seoBase = (allow: (c: Copy) => boolean) => ({ pageKey: "home", ...cols("title", meta.title, allow), ...cols("description", meta.description, allow), ogImageMediaId: og, robotsIndex: true, robotsFollow: true });
  await singleton("SEO home (published)", () => prisma.seoSettings.findFirst({ where: { pageKey: "home", state: "PUBLISHED" } }), () => prisma.seoSettings.create({ data: ({ state: "PUBLISHED", ...seoBase(isLive) } as never) }));
  if (isDraftish(meta.description)) {
    await singleton("SEO home (draft with unapproved description)", () => prisma.seoSettings.findFirst({ where: { pageKey: "home", state: "DRAFT" } }), () => prisma.seoSettings.create({ data: ({ state: "DRAFT", ...seoBase((c) => isLive(c) || isDraftish(c)) } as never) }));
    log("pending", "SEO meta description is a draft. Review and publish SEO in the CMS.");
  }
  if (!SITE_SETTINGS.siteUrl) log("pending", "Production domain (site URL) is not set");

  // Project categories
  const kindToVisual: Record<ProjectKind, "WEBSITE" | "WEB_MOBILE" | "MOBILE" | "SYSTEM"> = { website: "WEBSITE", "web-mobile": "WEB_MOBILE", mobile: "MOBILE", system: "SYSTEM" };
  const categoryIds = new Map<ProjectKind, number>();
  let order = 0;
  for (const [kind, label] of Object.entries(PROJECT_KINDS) as [ProjectKind, { en: string; ar: string }][]) {
    const existing = await prisma.projectCategory.findUnique({ where: { slug: kind } });
    if (existing) {
      categoryIds.set(kind, existing.id);
      log("skipped", `Project category ${kind}`);
    } else if (DRY) {
      log("created", `Project category ${kind} [dry run]`);
    } else {
      const row = await prisma.projectCategory.create({ data: { name: label.en, nameAr: label.ar, slug: kind, visualKind: kindToVisual[kind], sortOrder: order } });
      categoryIds.set(kind, row.id);
      log("created", `Project category ${kind}`);
    }
    order++;
  }

  // Projects
  for (const [i, p] of PROJECTS.entries()) {
    if (p.status !== "confirmed") continue;
    if (await prisma.project.findUnique({ where: { slug: p.id } })) {
      log("skipped", `Project ${p.id}`);
      continue;
    }
    const live = p.links.find((l) => l.label === "live")?.url ?? null;
    const repo = p.links.find((l) => l.label === "repo")?.url ?? null;
    if (isLive(p.description) && hasText(p.description)) {
      // approved text: import
    } else if (hasText(p.description)) {
      log("pending", `Project "${p.title}" description (${p.description.status}): "${p.description.en}"  — paste it into the project in the CMS once approved`);
    } else {
      log("missing", `Project "${p.title}": no description provided`);
    }
    if (!live) log("missing", `Project "${p.title}": no public link`);
    if (DRY) {
      log("created", `Project ${p.id} [dry run]`);
      continue;
    }
    const categoryId = categoryIds.get(p.kind);
    if (!categoryId) throw new Error(`Category ${p.kind} is missing`);
    await prisma.project.create({
      data: {
        title: p.title,
        slug: p.id,
        categoryId,
        shortDescription: isLive(p.description) ? p.description.en : null,
        shortDescriptionAr: isLive(p.description) ? (p.description.ar ?? null) : null,
        liveUrl: live,
        repositoryUrl: repo,
        sortOrder: i,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    log("created", `Project ${p.id}`);
  }

  // Social links
  const platform: Record<SocialKind, "GITHUB" | "LINKEDIN" | "BEHANCE" | "DRIBBBLE" | "WEBSITE"> = { github: "GITHUB", linkedin: "LINKEDIN", behance: "BEHANCE", dribbble: "DRIBBBLE", website: "WEBSITE" };
  const labels: Record<SocialKind, { en: string; ar: string }> = { github: { en: "GitHub", ar: "GitHub" }, linkedin: { en: "LinkedIn", ar: "LinkedIn" }, behance: { en: "Behance", ar: "Behance" }, dribbble: { en: "Dribbble", ar: "Dribbble" }, website: { en: "Website", ar: "الموقع" } };
  for (const [i, l] of SOCIAL_LINKS.entries()) {
    if (l.status !== "confirmed") continue;
    if (await prisma.socialLink.findFirst({ where: { url: l.url } })) {
      log("skipped", `Social link ${l.kind}`);
      continue;
    }
    if (DRY) {
      log("created", `Social link ${l.kind} [dry run]`);
      continue;
    }
    await prisma.socialLink.create({ data: { platform: platform[l.kind], label: labels[l.kind].en, labelAr: labels[l.kind].ar, handle: l.handle, url: l.url, sortOrder: i, status: "PUBLISHED" } });
    log("created", `Social link ${l.kind}`);
  }

  // Sections and navigation (stable keys; order follows the default page order)
  const sectionOrder: [SectionId | "hero", string][] = [["hero", "Hero"], ["about", "About"], ["skills", "Skills"], ["work", "Work"], ["certifications", "Certifications"], ["experience", "Experience"], ["achievements", "Achievements"], ["contact", "Contact"]];
  for (const [i, [id, name]] of sectionOrder.entries()) {
    const key = id.toUpperCase() as "HERO" | "ABOUT" | "SKILLS" | "WORK" | "CERTIFICATIONS" | "EXPERIENCE" | "ACHIEVEMENTS" | "CONTACT";
    const navItem = NAV.find((n) => n.id === id);
    const enabled = id === "hero" ? true : SITE_SETTINGS.sections[id as SectionId];
    if (await prisma.sectionSetting.findUnique({ where: { sectionKey: key } })) {
      log("skipped", `Section ${key}`);
    } else if (DRY) {
      log("created", `Section ${key} [dry run]`);
    } else {
      await prisma.sectionSetting.create({ data: { sectionKey: key, displayName: navItem?.label.en ?? name, displayNameAr: navItem?.label.ar ?? null, isEnabled: enabled, sortOrder: i, configuration: key === "EXPERIENCE" ? { showNextCard: SITE_SETTINGS.showNextCard } : undefined } });
      log("created", `Section ${key} (${enabled ? "enabled" : "disabled"})`);
    }
    if (navItem) {
      if (await prisma.navigationItem.findUnique({ where: { sectionKey: key } })) log("skipped", `Navigation ${key}`);
      else if (DRY) log("created", `Navigation ${key} [dry run]`);
      else {
        await prisma.navigationItem.create({ data: { sectionKey: key, label: navItem.label.en, labelAr: navItem.label.ar, sortOrder: i, isVisible: true } });
        log("created", `Navigation ${key}`);
      }
    }
  }

  log("missing", "Skills: no technologies were confirmed yet");
  log("missing", "Experience and education: not provided yet (LinkedIn could not be read automatically)");
  log("missing", "Certifications and achievements: sections excluded by the owner");

  await writeReport();
}

async function writeReport() {
  const section = (title: string, lines: string[]) => `## ${title} (${lines.length})\n\n${lines.length ? lines.map((l) => `- ${l}`).join("\n") : "_none_"}\n`;
  const body = [
    `# Static content import report`,
    ``,
    `${DRY ? "**Dry run.** Nothing was written." : "Import completed."} Generated ${new Date().toISOString()}.`,
    ``,
    section("Created", report.created),
    section("Skipped (already existed, not overwritten)", report.skipped),
    section("Pending your approval", report.pending),
    section("Missing information", report.missing),
  ].join("\n");
  await writeFile(path.join(repoRoot, "content", DRY ? "import-report.dry-run.md" : "import-report.md"), body, "utf8");
  console.log(body);
}

main()
  .catch((err) => {
    console.error("\nImport failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

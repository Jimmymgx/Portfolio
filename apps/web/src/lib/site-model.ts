import { cache } from "react";
import { cookies, draftMode } from "next/headers";
import type { PublicPortfolio, PublicProject } from "@portfolio/types";
import type { SectionKey } from "@portfolio/validation";
import type { AboutModel } from "@/components/sections/About";
import type { AchView } from "@/components/sections/Achievements";
import type { CertView } from "@/components/sections/Certifications";
import type { ContactLink } from "@/components/sections/Contact";
import type { IdCardData } from "@/components/sections/IdCard";
import type { SkillView } from "@/components/sections/Skills";
import type { TimelineItem } from "@/components/sections/Timeline";
import type { ProjectView } from "@/components/sections/Work";
import { fetchPortfolio } from "./api";
import {
  PROFILE,
  PROJECT_KINDS,
  SHOW_DRAFTS,
  SITE_SETTINGS,
  USE_SAMPLE,
  getContent,
  getNav,
  isDraft,
  loc,
  txt,
} from "./content";
import { NAV, type ProjectKind, type SectionId } from "./data";
import { ui, type Locale } from "./i18n";

export const PREVIEW_COOKIE = "pf_preview";

export interface Cta {
  text: string;
  href: string;
}

export interface SiteModel {
  source: "api" | "static";
  banner: "sample" | "draft" | "preview" | null;
  maintenance: boolean;

  showHero: boolean;
  name: string;
  ghost: string;
  nameLines: string[];
  initials: string;
  title: string;
  roleLine: string | null;
  intro: string | null;
  introDraft: boolean;
  poster: string;
  video: { webm: string | null; mp4: string | null } | null;
  audioEnabled: boolean;
  resumeUrl: string | null;
  primaryCta: Cta | null;
  secondaryCta: Cta | null;

  /** Enabled sections that have content, in display order. Numbers on the page follow this order. */
  sections: { id: SectionId; label: string }[];

  about: AboutModel;
  skills: { families: { id: string; label: string }[]; items: SkillView[] };
  projects: ProjectView[];
  timeline: TimelineItem[];
  showNextCard: boolean;
  certifications: CertView[];
  achievements: AchView[];
  contact: {
    email: string | null;
    phone: string | null;
    whatsappUrl: string | null;
    links: ContactLink[];
    headline: string[] | null;
    intro: string | null;
    formEnabled: boolean;
  };
  footerText: string | null;

  meta: {
    title: string;
    description: string | null;
    siteUrl: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    favicon: string | null;
    robots: { index: boolean; follow: boolean };
  };
}

/* ───────────────────────── shared helpers ───────────────────────── */

const splitName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 1 ? [parts.slice(0, -1).join(" "), parts[parts.length - 1]!] : [name];
};

const monthYear = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

const ms = (iso: string | null | undefined) => (iso ? Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) : 0);

interface Neutral {
  id: string;
  kind: "work" | "edu";
  title: string;
  org: string;
  details: string[];
  date: string;
  sortEnd: number;
  sortStart: number;
  draft: boolean;
}

/** Newest first. A current position counts as ending "now". */
function sortTimeline(items: Neutral[]): TimelineItem[] {
  return [...items]
    .sort((a, b) => b.sortEnd - a.sortEnd || b.sortStart - a.sortStart)
    .map(({ id, kind, title, org, details, date, draft }) => ({ id, kind, title, org, details, date, draft }));
}

const KIND_FROM_VISUAL: Record<string, ProjectKind> = { WEBSITE: "website", WEB_MOBILE: "web-mobile", MOBILE: "mobile", SYSTEM: "system" };

/* ───────────────────────── from the API ───────────────────────── */

const SECTION_ID: Record<SectionKey, SectionId | "hero"> = {
  HERO: "hero",
  ABOUT: "about",
  SKILLS: "skills",
  WORK: "work",
  CERTIFICATIONS: "certifications",
  EXPERIENCE: "experience",
  ACHIEVEMENTS: "achievements",
  CONTACT: "contact",
};

const DEFAULT_ORDER: SectionId[] = ["about", "skills", "work", "certifications", "experience", "achievements", "contact"];

function fromApi(p: PublicPortfolio, locale: Locale, preview: boolean): SiteModel {
  const t = ui(locale);
  const profile = p.profile!;
  const hero = p.hero;
  const about = p.about;
  const contact = p.contact;
  const name = profile.displayName;

  const projects: ProjectView[] = p.projects.map((pr: PublicProject) => {
    const cover = pr.media.find((m) => m.isCover) ?? pr.media[0];
    return {
      id: String(pr.slug),
      title: pr.title,
      kind: KIND_FROM_VISUAL[pr.category.visualKind] ?? "website",
      kindLabel: pr.category.name,
      description: pr.shortDescription,
      descriptionDraft: false,
      features: pr.features.map((f) => f.title),
      technologies: pr.technologies.map((x) => x.name),
      liveUrl: pr.liveUrl,
      repoUrl: pr.repositoryUrl,
      screenshot: cover?.url || pr.coverUrl || null,
      screenshotIllustrative: !!cover?.isIllustrative,
    };
  });

  const titleBySlug = Object.fromEntries(p.projects.map((pr) => [pr.slug, pr.title]));
  const families = p.skills.map((c) => ({ id: c.slug, label: c.name }));
  const skillItems: SkillView[] = p.skills.flatMap((c) =>
    c.skills.map((s) => ({
      id: s.slug,
      name: s.name,
      symbol: s.symbol,
      logo: s.logoKey,
      logoUrl: s.logoUrl,
      familyId: c.slug,
      familyLabel: c.name,
      projects: s.projectSlugs.map((slug) => titleBySlug[slug]).filter(Boolean) as string[],
    })),
  );

  const neutral: Neutral[] = [
    ...p.experience.map<Neutral>((e) => ({
      id: `w-${e.id}`,
      kind: "work",
      title: e.position,
      org: e.organization,
      details: e.description ? [e.description] : [],
      date: `${monthYear(e.startDate, locale)} — ${e.isCurrent || !e.endDate ? t.present : monthYear(e.endDate, locale)}`,
      sortEnd: e.isCurrent || !e.endDate ? Number.MAX_SAFE_INTEGER : ms(e.endDate),
      sortStart: ms(e.startDate),
      draft: false,
    })),
    ...p.education.map<Neutral>((e) => ({
      id: `e-${e.id}`,
      kind: "edu",
      title: [e.qualification, e.fieldOfStudy].filter(Boolean).join(" · "),
      org: e.institution,
      details: e.description ? [e.description] : [],
      date: e.startDate && e.endDate ? `${e.startDate.slice(0, 4)} — ${e.endDate.slice(0, 4)}` : (e.endDate ?? e.startDate ?? "").slice(0, 4),
      sortEnd: ms(e.endDate ?? e.startDate),
      sortStart: ms(e.startDate ?? e.endDate),
      draft: false,
    })),
  ];
  const timeline = sortTimeline(neutral);

  const links: ContactLink[] = p.socialLinks.map((l) => ({ id: `s-${l.id}`, label: l.label, url: l.url, handle: l.handle }));
  const email = contact?.email ?? profile.publicEmail;

  const facts: AboutModel["facts"] = [];
  if (profile.location) facts.push({ k: t.location, v: profile.location });
  if (profile.roleLine) facts.push({ k: t.role, v: profile.roleLine });
  if (profile.expertise) facts.push({ k: t.expertise, v: profile.expertise });
  if (profile.audience) facts.push({ k: t.audience, v: profile.audience });
  if (email) facts.push({ k: t.email, v: email, href: `mailto:${email}` });
  for (const f of about?.facts ?? []) facts.push({ k: f.label, v: f.value });

  const card: IdCardData = {
    header: about?.idCard.title ?? (locale === "ar" ? "هوية مطوّر" : "DEVELOPER ID"),
    name,
    role: profile.professionalTitle,
    avatar: about?.idCard.portraitUrl ?? profile.avatarUrl ?? "/portrait-bust.webp",
    expertise: profile.expertise,
    roleLine: profile.roleLine,
    email,
    projects: projects.slice(0, 3).map((x) => x.title),
    closing: about?.idCard.backContent ?? null,
  };

  const aboutModel: AboutModel = {
    lead: about?.introduction ?? profile.biography ?? profile.shortBiography,
    leadDraft: false,
    philosophy: about?.fullDescription ?? null,
    quote: about?.quote ?? null,
    facts,
    links: links.map((l) => ({ id: l.id, label: l.label, url: l.url })),
    resumeUrl: profile.resumeUrl,
    showIdCard: about?.showIdCard ?? true,
    card,
  };

  const has: Record<SectionId, boolean> = {
    about: true,
    skills: skillItems.length > 0,
    work: projects.length > 0,
    certifications: p.certifications.length > 0,
    experience: timeline.length > 0,
    achievements: p.achievements.length > 0,
    contact: true,
  };

  // Enabled sections in the CMS order. Without saved settings the default order is used.
  const enabled = p.sections.length > 0 ? p.sections.map((s) => SECTION_ID[s.key]).filter((id): id is SectionId => id !== "hero") : DEFAULT_ORDER;
  const labelFor = (id: SectionId): string => {
    const key = id.toUpperCase() as SectionKey;
    return p.navigation.find((n) => n.sectionKey === key)?.label ?? p.sections.find((s) => s.key === key)?.displayName ?? loc(SITE_NAV_LABEL[id], locale);
  };
  const sections = enabled.filter((id) => has[id]).map((id) => ({ id, label: labelFor(id) }));

  const siteName = p.site?.siteName ?? name;
  const title = p.seo?.title ?? (p.site ? `${siteName} — ${profile.professionalTitle}` : `${name} — ${profile.professionalTitle}`);
  const siteUrl = p.site?.siteUrl ?? SITE_SETTINGS.siteUrl;

  return {
    source: "api",
    banner: preview ? "preview" : null,
    maintenance: !!p.site?.maintenanceMode && !preview,
    showHero: p.sections.length === 0 || p.sections.some((s) => s.key === "HERO"),
    name,
    ghost: hero?.backgroundWord ?? profile.firstName,
    nameLines: splitName(hero?.headline ?? name),
    initials: profile.initials,
    title: hero?.subtitle ?? profile.professionalTitle,
    roleLine: profile.roleLine,
    intro: hero?.description ?? null,
    introDraft: false,
    poster: hero?.posterUrl ?? hero?.fallbackImageUrl ?? "/hero/hero-poster.webp",
    video: hero?.video ? { webm: hero.video.webmUrl, mp4: hero.video.mp4Url } : null,
    audioEnabled: hero?.audioEnabled ?? true,
    resumeUrl: profile.resumeUrl,
    primaryCta: hero?.primaryButton ? { text: hero.primaryButton.text, href: hero.primaryButton.url } : null,
    secondaryCta: hero?.secondaryButton ? { text: hero.secondaryButton.text, href: hero.secondaryButton.url } : null,
    sections,
    about: aboutModel,
    skills: { families, items: skillItems },
    projects,
    timeline,
    showNextCard: !!p.sections.find((s) => s.key === "EXPERIENCE")?.configuration?.showNextCard,
    certifications: p.certifications.map((c) => ({ id: c.id, name: c.title, issuer: c.issuer, date: c.issueDate ? c.issueDate.slice(0, 4) : null, url: c.verificationUrl })),
    achievements: p.achievements.map((a) => ({
      id: a.id,
      title: a.title,
      caption: a.description,
      detail: a.platform,
      figure: a.numericValue != null ? { value: a.numericValue, suffix: a.numericSuffix } : null,
      logo: a.logoKey,
      logoUrl: a.logoUrl,
    })),
    contact: {
      email,
      phone: contact?.phone ?? null,
      whatsappUrl: contact?.whatsappUrl ?? null,
      links,
      headline: contact?.heading ? contact.heading.split("\n").map((l) => l.trim()).filter(Boolean) : null,
      intro: contact?.description ?? null,
      formEnabled: !!contact?.enableContactForm,
    },
    footerText: p.site?.footerText ?? null,
    meta: {
      title,
      description: p.seo?.description ?? p.site?.siteDescription ?? profile.roleLine,
      siteUrl,
      canonical: p.seo?.canonicalUrl ?? null,
      ogTitle: p.seo?.ogTitle ?? null,
      ogDescription: p.seo?.ogDescription ?? null,
      ogImage: p.seo?.ogImageUrl ?? null,
      favicon: p.site?.faviconUrl ?? null,
      robots: { index: p.seo?.robotsIndex ?? true, follow: p.seo?.robotsFollow ?? true },
    },
  };
}

/* ───────────────────────── from the static file (fallback and review modes) ───────────────────────── */

const SITE_NAV_LABEL = Object.fromEntries(NAV.map((n) => [n.id, n.label])) as Record<SectionId, { en: string; ar: string }>;

function fromStatic(locale: Locale): SiteModel {
  const t = ui(locale);
  const content = getContent();
  const nav = getNav(content);
  const name = txt(PROFILE.displayName, locale) ?? "";
  const email = content.email;

  const projects: ProjectView[] = content.projects.map((p) => {
    const desc = txt(p.description, locale);
    return {
      id: p.id,
      title: p.title,
      kind: p.kind,
      kindLabel: loc(PROJECT_KINDS[p.kind], locale),
      description: desc,
      descriptionDraft: !!desc && isDraft(p.description.status),
      features: p.features.map((f) => txt(f, locale)).filter(Boolean) as string[],
      technologies: p.technologies,
      liveUrl: p.links.find((l) => l.label === "live")?.url ?? null,
      repoUrl: p.links.find((l) => l.label === "repo")?.url ?? null,
      screenshot: p.screenshot,
    };
  });

  const titleById = Object.fromEntries(content.projects.map((p) => [p.id, p.title]));
  const families = content.skillGroups.map((g) => ({ id: g.id, label: loc(g.label, locale) }));
  const skillItems: SkillView[] = content.skillGroups.flatMap((g) =>
    g.skills.map((sk) => ({
      id: sk.id,
      name: sk.name,
      symbol: sk.symbol,
      logo: sk.logo,
      familyId: g.id,
      familyLabel: loc(g.label, locale),
      projects: (sk.projectIds ?? []).map((id) => titleById[id]).filter(Boolean) as string[],
    })),
  );

  const neutral: Neutral[] = [
    ...content.experience.map<Neutral>((e) => ({
      id: `w-${e.id}`,
      kind: "work",
      title: txt(e.role, locale) ?? "",
      org: e.organization,
      details: e.details.map((d) => txt(d, locale)).filter(Boolean) as string[],
      date: `${e.start} — ${e.end === "present" ? t.present : e.end}`,
      sortEnd: e.end === "present" ? Number.MAX_SAFE_INTEGER : Number.parseInt(e.end, 10) || 0,
      sortStart: Number.parseInt(e.start, 10) || 0,
      draft: isDraft(e.status) || isDraft(e.role.status),
    })),
    ...content.education.map<Neutral>((e) => ({
      id: `e-${e.id}`,
      kind: "edu",
      title: [txt(e.qualification, locale), e.field ? txt(e.field, locale) : null].filter(Boolean).join(" · "),
      org: e.institution,
      details: [],
      date: e.start ? `${e.start} — ${e.end}` : e.end,
      sortEnd: Number.parseInt(e.end, 10) || 0,
      sortStart: Number.parseInt(e.start ?? e.end, 10) || 0,
      draft: isDraft(e.status) || isDraft(e.qualification.status),
    })),
  ];
  const timeline = sortTimeline(neutral);

  const roleLine = txt(PROFILE.roleLine, locale);
  const expertise = txt(PROFILE.expertise, locale);
  const audience = txt(PROFILE.audience, locale);
  const location = txt(PROFILE.location, locale);
  const bio = txt(PROFILE.bio, locale);
  const summary = txt(PROFILE.summary, locale);

  const facts: AboutModel["facts"] = [];
  if (location) facts.push({ k: t.location, v: location });
  if (roleLine) facts.push({ k: t.role, v: roleLine });
  if (expertise) facts.push({ k: t.expertise, v: expertise });
  if (audience) facts.push({ k: t.audience, v: audience });
  if (email) facts.push({ k: t.email, v: email, href: `mailto:${email}` });

  const links: ContactLink[] = content.social.map((l) => ({ id: l.kind, label: t[l.kind], url: l.url, handle: l.handle }));

  const aboutModel: AboutModel = {
    lead: bio ?? summary,
    leadDraft: bio ? isDraft(PROFILE.bio.status) : isDraft(PROFILE.summary.status),
    philosophy: txt(PROFILE.philosophy, locale),
    quote: txt(PROFILE.quote, locale),
    facts,
    links: links.map((l) => ({ id: l.id, label: l.label, url: l.url })),
    resumeUrl: PROFILE.resumeUrl,
    showIdCard: true,
    card: {
      header: txt(PROFILE.idCard.header, locale) ?? "ID",
      name,
      role: txt(PROFILE.title, locale) ?? "",
      avatar: PROFILE.avatarImage,
      expertise,
      roleLine,
      email,
      projects: content.projects.slice(0, 3).map((p) => p.title),
      closing: txt(PROFILE.idCard.backClosing, locale),
    },
  };

  const meta = SITE_SETTINGS.meta;
  const title = txt(meta.title, locale) ?? name;

  return {
    source: "static",
    banner: content.sample ? "sample" : SHOW_DRAFTS ? "draft" : null,
    maintenance: false,
    showHero: true,
    name,
    ghost: txt(PROFILE.firstName, locale) ?? name.split(" ")[0] ?? "",
    nameLines: splitName(name),
    initials: PROFILE.initials,
    title: txt(PROFILE.title, locale) ?? "",
    roleLine,
    intro: txt(PROFILE.intro, locale),
    introDraft: isDraft(PROFILE.intro.status),
    poster: PROFILE.heroPoster,
    video: PROFILE.heroVideo,
    audioEnabled: true,
    resumeUrl: PROFILE.resumeUrl,
    primaryCta: null,
    secondaryCta: null,
    sections: nav.map((n) => ({ id: n.id, label: loc(n.label, locale) })),
    about: aboutModel,
    skills: { families, items: skillItems },
    projects,
    timeline,
    showNextCard: SITE_SETTINGS.showNextCard,
    certifications: content.certifications.map((c) => ({ id: c.id, name: c.name, issuer: c.issuer, date: c.date ?? null, url: c.url ?? null })),
    achievements: content.achievements.map((a) => ({
      id: a.id,
      title: txt(a.title, locale),
      caption: a.caption ? txt(a.caption, locale) : null,
      detail: a.detail ? txt(a.detail, locale) : null,
      figure: a.figure ?? null,
      logo: a.logo ?? null,
    })),
    contact: { email, phone: null, whatsappUrl: null, links, headline: null, intro: null, formEnabled: false },
    footerText: null,
    meta: {
      title,
      description: txt(meta.description, locale) ?? roleLine,
      siteUrl: SITE_SETTINGS.siteUrl,
      canonical: null,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      favicon: null,
      robots: { index: true, follow: true },
    },
  };
}

/* ───────────────────────── entry point ───────────────────────── */

/**
 * The model for one language. Uses the CMS through the API; if the API is unreachable, or has no content yet,
 * the site still renders from the bundled static content so it never breaks.
 * Draft mode (set by the preview link) shows unpublished drafts and is never cached.
 */
export const getSiteModel = cache(async (locale: Locale): Promise<SiteModel> => {
  if (USE_SAMPLE || process.env.CONTENT_SOURCE === "static") return fromStatic(locale);

  let previewToken: string | null = null;
  const dm = await draftMode();
  if (dm.isEnabled) previewToken = (await cookies()).get(PREVIEW_COOKIE)?.value ?? null;

  try {
    const portfolio = await fetchPortfolio(locale, previewToken);
    if (portfolio.profile) return fromApi(portfolio, locale, !!previewToken);
    console.warn("[site] The API has no published profile yet; using the bundled static content.");
  } catch (err) {
    console.warn(`[site] API unavailable (${(err as Error).message}); using the bundled static content.`);
  }
  return fromStatic(locale);
});

import type {
  PublicAbout,
  PublicAchievement,
  PublicCertification,
  PublicContact,
  PublicEducation,
  PublicExperience,
  PublicHero,
  PublicLang,
  PublicNavigationItem,
  PublicPortfolio,
  PublicProfile,
  PublicProject,
  PublicSection,
  PublicSeo,
  PublicSite,
  PublicSkillCategory,
  PublicSocialLink,
} from "@portfolio/types";
import { Errors } from "../../common/errors/app-error.js";
import { absoluteMediaUrl } from "../../common/storage/storage.js";
import { dateOut } from "../../common/utils/serialize.js";
import { prisma } from "../../config/database.js";
import type { PublishStatus } from "../../generated/prisma/client.js";
import { readSeo, readSingleton } from "../profile/singletons.module.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Language resolution: Arabic when requested and present, otherwise English. Empty strings become null. */
const pick = (lang: PublicLang, en: string | null | undefined, ar: string | null | undefined): string | null => {
  const v = lang === "ar" && ar && ar.trim() ? ar : en;
  return v && v.trim() ? v : null;
};
const must = (lang: PublicLang, en: string, ar: string | null | undefined): string => pick(lang, en, ar) ?? en;
const url = (m: Row | null | undefined) => absoluteMediaUrl(m?.publicUrl);

/** Preview mode also shows DRAFT items. UNPUBLISHED is hidden everywhere. */
const visible = (preview: boolean): { status: PublishStatus | { in: PublishStatus[] } } => ({
  status: preview ? { in: ["PUBLISHED", "DRAFT"] } : "PUBLISHED",
});
const order = [{ sortOrder: "asc" }, { id: "asc" }] as const;

export interface Ctx {
  lang: PublicLang;
  preview: boolean;
}

export const publicService = {
  async site({ lang, preview }: Ctx): Promise<PublicSite | null> {
    const r = await readSingleton<Row>("siteSettings", preview, { favicon: true, logo: true });
    if (!r) return null;
    return {
      siteName: must(lang, r.siteName, r.siteNameAr),
      siteDescription: pick(lang, r.siteDescription, r.siteDescriptionAr),
      siteUrl: r.siteUrl ?? null,
      primaryLanguage: r.primaryLanguage,
      footerText: pick(lang, r.footerText, r.footerTextAr),
      maintenanceMode: r.maintenanceMode,
      faviconUrl: url(r.favicon),
      logoUrl: url(r.logo),
    };
  },

  async profile({ lang, preview }: Ctx): Promise<PublicProfile | null> {
    const r = await readSingleton<Row>("profile", preview, { avatar: true, resume: true });
    if (!r) return null;
    return {
      fullName: must(lang, r.fullName, r.fullNameAr),
      displayName: must(lang, r.displayName, r.displayNameAr),
      firstName: must(lang, r.firstName, r.firstNameAr),
      initials: r.initials,
      professionalTitle: must(lang, r.professionalTitle, r.professionalTitleAr),
      roleLine: pick(lang, r.roleLine, r.roleLineAr),
      tagline: pick(lang, r.tagline, r.taglineAr),
      expertise: pick(lang, r.expertise, r.expertiseAr),
      audience: pick(lang, r.audience, r.audienceAr),
      location: pick(lang, r.location, r.locationAr),
      publicEmail: r.publicEmail ?? null,
      publicPhone: r.publicPhone ?? null,
      biography: pick(lang, r.biography, r.biographyAr),
      shortBiography: pick(lang, r.shortBiography, r.shortBiographyAr),
      professionalStatement: pick(lang, r.professionalStatement, r.professionalStatementAr),
      avatarUrl: url(r.avatar),
      resumeUrl: url(r.resume),
    };
  },

  async hero({ lang, preview }: Ctx): Promise<PublicHero | null> {
    const r = await readSingleton<Row>("hero", preview, { videoMp4: true, videoWebm: true, poster: true, fallbackImage: true });
    if (!r) return null;
    const btn = (text: string | null, textAr: string | null, link: string | null) => {
      const t = pick(lang, text, textAr);
      return t && link ? { text: t, url: link } : null;
    };
    const mp4 = url(r.videoMp4);
    const webm = url(r.videoWebm);
    return {
      headline: pick(lang, r.headline, r.headlineAr),
      subtitle: pick(lang, r.subtitle, r.subtitleAr),
      description: pick(lang, r.description, r.descriptionAr),
      backgroundWord: pick(lang, r.backgroundWord, r.backgroundWordAr),
      primaryButton: btn(r.primaryButtonText, r.primaryButtonTextAr, r.primaryButtonUrl),
      secondaryButton: btn(r.secondaryButtonText, r.secondaryButtonTextAr, r.secondaryButtonUrl),
      audioEnabled: r.audioEnabled,
      video: mp4 || webm ? { mp4Url: mp4, webmUrl: webm } : null,
      posterUrl: url(r.poster),
      fallbackImageUrl: url(r.fallbackImage),
    };
  },

  async about({ lang, preview }: Ctx): Promise<PublicAbout | null> {
    const r = await readSingleton<Row>("about", preview, { idCardPortrait: true });
    const facts = await prisma.aboutFact.findMany({ where: visible(preview), orderBy: [...order] });
    if (!r && facts.length === 0) return null;
    return {
      heading: pick(lang, r?.heading, r?.headingAr),
      introduction: pick(lang, r?.introduction, r?.introductionAr),
      fullDescription: pick(lang, r?.fullDescription, r?.fullDescriptionAr),
      quote: pick(lang, r?.quote, r?.quoteAr),
      showIdCard: r?.showIdCard ?? true,
      idCard: {
        title: pick(lang, r?.idCardTitle, r?.idCardTitleAr),
        subtitle: pick(lang, r?.idCardSubtitle, r?.idCardSubtitleAr),
        backContent: pick(lang, r?.idCardBackContent, r?.idCardBackContentAr),
        portraitUrl: url(r?.idCardPortrait),
      },
      facts: facts.map((f) => ({ id: f.id, label: must(lang, f.label, f.labelAr), value: must(lang, f.value, f.valueAr), icon: f.icon })),
    };
  },

  async skills({ lang, preview }: Ctx): Promise<PublicSkillCategory[]> {
    const rows = await prisma.skillCategory.findMany({
      where: visible(preview),
      orderBy: [...order],
      include: {
        skills: {
          where: visible(preview),
          orderBy: [...order],
          include: { logo: true, projects: { include: { project: { select: { slug: true, status: true } } } } },
        },
      },
    });
    return rows
      .filter((c) => c.skills.length > 0)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: must(lang, c.name, c.nameAr),
        description: pick(lang, c.description, c.descriptionAr),
        skills: c.skills.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          symbol: s.symbol,
          logoUrl: url(s.logo),
          logoKey: s.externalLogoReference,
          description: pick(lang, s.description, s.descriptionAr),
          projectSlugs: s.projects.filter((p) => p.project.status === "PUBLISHED" || (preview && p.project.status === "DRAFT")).map((p) => p.project.slug),
        })),
      }));
  },

  async projects({ lang, preview }: Ctx, slug?: string): Promise<PublicProject[]> {
    const rows = await prisma.project.findMany({
      where: { ...visible(preview), ...(slug ? { slug } : {}) },
      orderBy: [...order],
      include: {
        category: true,
        features: { orderBy: [...order] },
        media: { include: { media: true }, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
        skills: { orderBy: { sortOrder: "asc" }, include: { skill: { select: { slug: true, name: true, symbol: true, status: true } } } },
      },
    });
    return rows.map((p) => {
      const media = p.media.map((m) => ({
        id: m.id,
        url: url(m.media) ?? "",
        alt: pick(lang, m.media.altText, m.media.altTextAr),
        caption: pick(lang, m.caption, m.captionAr),
        isCover: m.isCover,
        isIllustrative: m.isIllustrative,
      }));
      return {
        id: p.id,
        slug: p.slug,
        title: must(lang, p.title, p.titleAr),
        category: { slug: p.category.slug, name: must(lang, p.category.name, p.category.nameAr), visualKind: p.category.visualKind },
        shortDescription: pick(lang, p.shortDescription, p.shortDescriptionAr),
        fullDescription: pick(lang, p.fullDescription, p.fullDescriptionAr),
        problemStatement: pick(lang, p.problemStatement, p.problemStatementAr),
        solution: pick(lang, p.solution, p.solutionAr),
        role: pick(lang, p.role, p.roleAr),
        stage: p.stage,
        liveUrl: p.liveUrl,
        repositoryUrl: p.repositoryUrl,
        featured: p.featured,
        coverUrl: (media.find((m) => m.isCover) ?? media[0])?.url ?? null,
        features: p.features.map((f) => ({ title: must(lang, f.title, f.titleAr), description: pick(lang, f.description, f.descriptionAr) })),
        technologies: p.skills.filter((s) => s.skill.status === "PUBLISHED" || (preview && s.skill.status === "DRAFT")).map((s) => ({ slug: s.skill.slug, name: s.skill.name, symbol: s.skill.symbol })),
        media,
      };
    });
  },

  async project(ctx: Ctx, slug: string): Promise<PublicProject> {
    const [p] = await this.projects(ctx, slug);
    if (!p) throw Errors.notFound("Project");
    return p;
  },

  async experience({ lang, preview }: Ctx): Promise<PublicExperience[]> {
    const rows = await prisma.experience.findMany({ where: visible(preview), orderBy: [{ startDate: "desc" }, { id: "desc" }] });
    return rows.map((r) => ({
      id: r.id,
      organization: must(lang, r.organization, r.organizationAr),
      position: must(lang, r.position, r.positionAr),
      employmentType: r.employmentType,
      location: pick(lang, r.location, r.locationAr),
      startDate: dateOut(r.startDate)!,
      endDate: r.isCurrent ? null : dateOut(r.endDate),
      isCurrent: r.isCurrent,
      description: pick(lang, r.description, r.descriptionAr),
    }));
  },

  async education({ lang, preview }: Ctx): Promise<PublicEducation[]> {
    const rows = await prisma.education.findMany({ where: visible(preview), orderBy: [{ endDate: "desc" }, { id: "desc" }] });
    return rows.map((r) => ({
      id: r.id,
      institution: must(lang, r.institution, r.institutionAr),
      qualification: must(lang, r.qualification, r.qualificationAr),
      fieldOfStudy: pick(lang, r.fieldOfStudy, r.fieldOfStudyAr),
      startDate: dateOut(r.startDate),
      endDate: dateOut(r.endDate),
      description: pick(lang, r.description, r.descriptionAr),
    }));
  },

  async certifications({ lang, preview }: Ctx): Promise<PublicCertification[]> {
    const rows = await prisma.certification.findMany({ where: visible(preview), orderBy: [...order], include: { media: true } });
    return rows.map((r) => ({
      id: r.id,
      title: must(lang, r.title, r.titleAr),
      issuer: must(lang, r.issuer, r.issuerAr),
      issueDate: dateOut(r.issueDate),
      verificationUrl: r.verificationUrl,
      description: pick(lang, r.description, r.descriptionAr),
      imageUrl: url(r.media),
    }));
  },

  async achievements({ lang, preview }: Ctx): Promise<PublicAchievement[]> {
    const rows = await prisma.achievement.findMany({ where: visible(preview), orderBy: [...order], include: { logo: true } });
    return rows.map((r) => ({
      id: r.id,
      title: must(lang, r.title, r.titleAr),
      description: pick(lang, r.description, r.descriptionAr),
      numericValue: r.numericValue,
      numericSuffix: r.numericSuffix,
      platform: r.platform,
      logoUrl: url(r.logo),
      logoKey: r.logoKey,
      verificationUrl: r.verificationUrl,
    }));
  },

  async socialLinks({ lang, preview }: Ctx): Promise<PublicSocialLink[]> {
    const rows = await prisma.socialLink.findMany({ where: visible(preview), orderBy: [...order] });
    return rows.map((r) => ({ id: r.id, platform: r.platform, label: must(lang, r.label, r.labelAr), handle: r.handle, url: r.url, icon: r.icon }));
  },

  /** Contact block. Phone and WhatsApp appear only when the owner switched them on. */
  async contact({ lang, preview }: Ctx): Promise<PublicContact | null> {
    const c = await readSingleton<Row>("contactSettings", preview);
    const p = await readSingleton<Row>("profile", preview);
    if (!c && !p) return null;
    return {
      heading: pick(lang, c?.heading, c?.headingAr),
      description: pick(lang, c?.description, c?.descriptionAr),
      email: c?.publicEmail || p?.publicEmail || null,
      phone: c?.showPhone ? (c.publicPhone ?? p?.publicPhone ?? null) : null,
      whatsappUrl: c?.showWhatsapp ? (c.whatsappUrl ?? null) : null,
      enableContactForm: !!c?.enableContactForm,
    };
  },

  async sections(_ctx: Ctx): Promise<PublicSection[]> {
    const rows = await prisma.sectionSetting.findMany({ where: { isEnabled: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    return rows.map((r) => ({ key: r.sectionKey, displayName: must(_ctx.lang, r.displayName, r.displayNameAr), configuration: (r.configuration as PublicSection["configuration"]) ?? null }));
  },

  async navigation(ctx: Ctx): Promise<PublicNavigationItem[]> {
    const [items, sections] = await Promise.all([
      prisma.navigationItem.findMany({ where: { isVisible: true }, orderBy: [...order] }),
      prisma.sectionSetting.findMany({ where: { isEnabled: true } }),
    ]);
    const enabled = new Set(sections.map((s) => s.sectionKey));
    if (items.length === 0) {
      // No custom navigation saved yet: derive it from the enabled sections.
      const secs = await this.sections(ctx);
      return secs.filter((s) => s.key !== "HERO").map((s, i) => ({ id: -(i + 1), sectionKey: s.key, label: s.displayName, targetUrl: null }));
    }
    return items
      .filter((n) => !n.sectionKey || enabled.has(n.sectionKey))
      .map((n) => ({ id: n.id, sectionKey: n.sectionKey, label: must(ctx.lang, n.label, n.labelAr), targetUrl: n.targetUrl }));
  },

  async seo({ lang, preview }: Ctx, pageKey = "home"): Promise<PublicSeo | null> {
    const r = await readSeo<Row>(pageKey, preview);
    if (!r) return null;
    return {
      title: pick(lang, r.title, r.titleAr),
      description: pick(lang, r.description, r.descriptionAr),
      canonicalUrl: r.canonicalUrl ?? null,
      ogTitle: pick(lang, r.ogTitle, r.ogTitleAr),
      ogDescription: pick(lang, r.ogDescription, r.ogDescriptionAr),
      ogImageUrl: url(r.ogImage),
      robotsIndex: r.robotsIndex,
      robotsFollow: r.robotsFollow,
    };
  },

  /** Everything the home page needs in a single request. */
  async portfolio(ctx: Ctx): Promise<PublicPortfolio> {
    const [site, profile, hero, about, skills, projects, experience, education, certifications, achievements, socialLinks, contact, navigation, sections, seo] =
      await Promise.all([
        this.site(ctx),
        this.profile(ctx),
        this.hero(ctx),
        this.about(ctx),
        this.skills(ctx),
        this.projects(ctx),
        this.experience(ctx),
        this.education(ctx),
        this.certifications(ctx),
        this.achievements(ctx),
        this.socialLinks(ctx),
        this.contact(ctx),
        this.navigation(ctx),
        this.sections(ctx),
        this.seo(ctx),
      ]);
    return { lang: ctx.lang, site, profile, hero, about, skills, projects, experience, education, certifications, achievements, socialLinks, contact, navigation, sections, seo };
  },
};

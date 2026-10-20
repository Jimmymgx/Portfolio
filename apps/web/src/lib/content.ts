import {
  ACHIEVEMENTS,
  CERTIFICATIONS,
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  NAV,
  PROFILE,
  PROJECTS,
  PROJECT_KINDS,
  SITE_SETTINGS,
  SKILL_GROUPS,
  SOCIAL_LINKS,
  type Achievement,
  type Certification,
  type Copy,
  type EducationItem,
  type ExperienceItem,
  type NavItem,
  type Project,
  type SectionId,
  type SkillGroup,
  type SocialLink,
  type Status,
} from "./data";
import type { Locale } from "./i18n";
import { SAMPLE } from "./sample-data";

/** Review mode: shows unapproved drafts so the owner can read them in context. */
export const SHOW_DRAFTS = process.env.NEXT_PUBLIC_SHOW_DRAFTS === "1";
/** Layout-testing mode: swaps in clearly fake sample records. Never set in production. */
export const USE_SAMPLE = process.env.NEXT_PUBLIC_SAMPLE_CONTENT === "1";

export function isVisible(status: Status): boolean {
  if (status === "confirmed") return true;
  if (SHOW_DRAFTS && (status === "awaiting_approval" || status === "draft")) return true;
  return false;
}

export function isDraft(status: Status): boolean {
  return status === "awaiting_approval" || status === "draft";
}

/** Returns publishable text for a locale, or null when the copy must stay hidden. */
export function txt(copy: Copy, locale: Locale): string | null {
  if (!isVisible(copy.status)) return null;
  const v = locale === "ar" ? copy.ar ?? copy.en : copy.en;
  return v && v.trim() ? v : null;
}

export function loc<T extends { en: string; ar: string }>(v: T, locale: Locale): string {
  return v[locale];
}

export function visible<T extends { status: Status }>(items: T[]): T[] {
  return items.filter((i) => isVisible(i.status));
}

export interface Content {
  projects: Project[];
  skillGroups: SkillGroup[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: Certification[];
  achievements: Achievement[];
  social: SocialLink[];
  email: string | null;
  sections: Record<SectionId, boolean>;
  sample: boolean;
}

export function getContent(): Content {
  const src = USE_SAMPLE
    ? SAMPLE
    : {
        skillGroups: SKILL_GROUPS,
        experience: EXPERIENCE,
        education: EDUCATION,
        certifications: CERTIFICATIONS,
        achievements: ACHIEVEMENTS,
        sections: null as null | Partial<Record<SectionId, boolean>>,
      };

  const skillGroups = src.skillGroups
    .map((g) => ({ ...g, skills: visible(g.skills) }))
    .filter((g) => g.skills.length > 0);
  const experience = visible(src.experience);
  const education = visible(src.education);
  const certifications = visible(src.certifications);
  const achievements = visible(src.achievements);
  const projects = visible(PROJECTS);

  const enabled = { ...SITE_SETTINGS.sections, ...(src.sections ?? {}) };
  const has: Record<SectionId, boolean> = {
    about: enabled.about,
    skills: enabled.skills && skillGroups.length > 0,
    work: enabled.work && projects.length > 0,
    certifications: enabled.certifications && certifications.length > 0,
    experience: enabled.experience && experience.length + education.length > 0,
    achievements: enabled.achievements && achievements.length > 0,
    contact: enabled.contact,
  };

  return {
    projects,
    skillGroups,
    experience,
    education,
    certifications,
    achievements,
    social: visible(SOCIAL_LINKS),
    email: isVisible(CONTACT.email.status) && CONTACT.email.value ? CONTACT.email.value : null,
    sections: has,
    sample: USE_SAMPLE,
  };
}

export function getNav(content: Content): NavItem[] {
  return NAV.filter((n) => content.sections[n.id]);
}

export { PROFILE, PROJECT_KINDS, SITE_SETTINGS };

/**
 * Public API payloads. Text is already resolved for the requested language
 * (Arabic falls back to English). Only published content ever appears here.
 */
import type { Lang, SectionKey } from "@portfolio/validation";

export type PublicLang = Lang;

export interface PublicSite {
  siteName: string;
  siteDescription: string | null;
  siteUrl: string | null;
  primaryLanguage: "EN" | "AR";
  footerText: string | null;
  maintenanceMode: boolean;
  faviconUrl: string | null;
  logoUrl: string | null;
}

export interface PublicProfile {
  fullName: string;
  displayName: string;
  firstName: string;
  initials: string;
  professionalTitle: string;
  roleLine: string | null;
  tagline: string | null;
  expertise: string | null;
  audience: string | null;
  location: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  biography: string | null;
  shortBiography: string | null;
  professionalStatement: string | null;
  avatarUrl: string | null;
  resumeUrl: string | null;
}

export interface PublicHero {
  headline: string | null;
  subtitle: string | null;
  description: string | null;
  backgroundWord: string | null;
  primaryButton: { text: string; url: string } | null;
  secondaryButton: { text: string; url: string } | null;
  audioEnabled: boolean;
  video: { mp4Url: string | null; webmUrl: string | null } | null;
  posterUrl: string | null;
  fallbackImageUrl: string | null;
}

export interface PublicAboutFact {
  id: number;
  label: string;
  value: string;
  icon: string | null;
}

export interface PublicAbout {
  heading: string | null;
  introduction: string | null;
  fullDescription: string | null;
  quote: string | null;
  showIdCard: boolean;
  idCard: { title: string | null; subtitle: string | null; backContent: string | null; portraitUrl: string | null };
  facts: PublicAboutFact[];
}

export interface PublicSkill {
  id: number;
  slug: string;
  name: string;
  symbol: string;
  logoUrl: string | null;
  logoKey: string | null;
  description: string | null;
  projectSlugs: string[];
}

export interface PublicSkillCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  skills: PublicSkill[];
}

export type PublicVisualKind = "WEBSITE" | "WEB_MOBILE" | "MOBILE" | "SYSTEM";

export interface PublicProjectMedia {
  id: number;
  url: string;
  alt: string | null;
  caption: string | null;
  isCover: boolean;
  isIllustrative: boolean;
}

export interface PublicProject {
  id: number;
  slug: string;
  title: string;
  category: { slug: string; name: string; visualKind: PublicVisualKind };
  shortDescription: string | null;
  fullDescription: string | null;
  problemStatement: string | null;
  solution: string | null;
  role: string | null;
  stage: "COMPLETED" | "IN_PROGRESS" | "MAINTENANCE" | "ARCHIVED";
  liveUrl: string | null;
  repositoryUrl: string | null;
  featured: boolean;
  coverUrl: string | null;
  features: { title: string; description: string | null }[];
  technologies: { slug: string; name: string; symbol: string }[];
  media: PublicProjectMedia[];
}

export interface PublicExperience {
  id: number;
  organization: string;
  position: string;
  employmentType: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface PublicEducation {
  id: number;
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

export interface PublicCertification {
  id: number;
  title: string;
  issuer: string;
  issueDate: string | null;
  verificationUrl: string | null;
  description: string | null;
  imageUrl: string | null;
}

export interface PublicAchievement {
  id: number;
  title: string;
  description: string | null;
  numericValue: number | null;
  numericSuffix: string | null;
  platform: string | null;
  logoUrl: string | null;
  logoKey: string | null;
  verificationUrl: string | null;
}

export interface PublicSocialLink {
  id: number;
  platform: string;
  label: string;
  handle: string | null;
  url: string;
  icon: string | null;
}

export interface PublicContact {
  heading: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  whatsappUrl: string | null;
  enableContactForm: boolean;
}

export interface PublicNavigationItem {
  id: number;
  sectionKey: SectionKey | null;
  label: string;
  targetUrl: string | null;
}

export interface PublicSection {
  key: SectionKey;
  displayName: string;
  configuration: { showNextCard?: boolean } | null;
}

export interface PublicSeo {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
}

/** Everything the home page needs, in one request. */
export interface PublicPortfolio {
  lang: PublicLang;
  site: PublicSite | null;
  profile: PublicProfile | null;
  hero: PublicHero | null;
  about: PublicAbout | null;
  skills: PublicSkillCategory[];
  projects: PublicProject[];
  experience: PublicExperience[];
  education: PublicEducation[];
  certifications: PublicCertification[];
  achievements: PublicAchievement[];
  socialLinks: PublicSocialLink[];
  contact: PublicContact | null;
  navigation: PublicNavigationItem[];
  /** Enabled sections in display order. */
  sections: PublicSection[];
  seo: PublicSeo | null;
}

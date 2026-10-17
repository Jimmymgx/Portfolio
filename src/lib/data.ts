/**
 * Central content store. Every personal fact on the site comes from this file.
 *
 * Rules:
 *  - Only entries with status "confirmed" are published in production.
 *  - "awaiting_approval" / "draft" entries are visible only in review mode
 *    (NEXT_PUBLIC_SHOW_DRAFTS=1) so the owner can review them in context.
 *  - "missing" / "excluded" entries are never rendered.
 *  - Nothing here comes from a résumé. Sources are the owner's own answers,
 *    their project sheet (names, types and public links only) and public sites.
 *  - Credentials, engineer names and internal notes from the project sheet are
 *    intentionally NOT stored anywhere in this repository.
 */

export type Status =
  | "confirmed"
  | "draft"
  | "awaiting_approval"
  | "missing"
  | "excluded";

/** Text in both site languages. If `ar` is omitted the English text is used. */
export interface Copy {
  en: string;
  ar?: string;
  status: Status;
}

export interface Localized {
  en: string;
  ar: string;
}

/* ───────────────────────────── Profile ───────────────────────────── */

export interface Profile {
  fullName: Copy;
  displayName: Copy;
  /** First name used for the ghost typography behind the hero portrait. */
  firstName: Copy;
  initials: string;
  title: Copy;
  /** Public role line, exactly as the owner gave it. */
  roleLine: Copy;
  /** Three tagline drafts. None is used until one is approved. */
  taglineOptions: Copy[];
  tagline: Copy;
  /** Short intro under the hero title. */
  intro: Copy;
  /** One-sentence summary composed only from the owner's answers. */
  summary: Copy;
  bio: Copy;
  philosophy: Copy;
  expertise: Copy;
  audience: Copy;
  location: Copy;
  quote: Copy;
  idCard: { header: Copy; backClosing: Copy };
  avatarImage: string;
  heroPoster: string;
  heroVideo: { webm: string; mp4: string } | null;
  resumeUrl: string | null;
}

export const PROFILE: Profile = {
  fullName: { en: "Mohamed Gamal", ar: "محمد جمال", status: "confirmed" },
  displayName: { en: "Mohamed Gamal", ar: "محمد جمال", status: "confirmed" },
  firstName: { en: "Mohamed", ar: "محمد", status: "confirmed" },
  initials: "MG",
  title: { en: "Fullstack Developer", ar: "مطوّر Full Stack", status: "confirmed" },
  roleLine: {
    en: "FullStack Developer | Project Manager",
    ar: "مطوّر Full Stack | مدير مشاريع",
    status: "confirmed",
  },
  taglineOptions: [
    {
      en: "Fullstack developer building web apps, end to end.",
      ar: "مطوّر Full Stack أبني تطبيقات الويب من الفكرة حتى التسليم.",
      status: "awaiting_approval",
    },
    {
      en: "Web apps, built and managed from first brief to launch.",
      ar: "تطبيقات ويب تُبنى وتُدار من أول تصوّر حتى الإطلاق.",
      status: "awaiting_approval",
    },
    {
      en: "Frontend, backend and project management for freelance clients.",
      ar: "واجهات وخوادم وإدارة مشاريع لعملاء العمل الحر.",
      status: "awaiting_approval",
    },
  ],
  tagline: { en: "", status: "missing" },
  intro: {
    en: "I build web applications, frontend and backend, and manage the work from first brief to delivery.",
    ar: "أبني تطبيقات الويب بواجهاتها وخوادمها، وأدير العمل من أول تصوّر حتى التسليم.",
    status: "awaiting_approval",
  },
  summary: {
    en: "Fullstack Developer and Project Manager building web applications, frontend and backend, for freelance clients.",
    ar: "مطوّر Full Stack ومدير مشاريع، أبني تطبيقات الويب بواجهاتها وخوادمها لعملاء العمل الحر.",
    // Re-phrasing of the owner's answers (expertise, role, audience). Flagged for review.
    status: "awaiting_approval",
  },
  bio: {
    en: "I'm Mohamed Gamal, a fullstack developer and project manager. I build web applications across the frontend and the backend for freelance clients, and I manage the work from the first brief through delivery.",
    ar: "أنا محمد جمال، مطوّر Full Stack ومدير مشاريع. أبني تطبيقات الويب بواجهاتها وخوادمها لعملاء العمل الحر، وأدير العمل من أول تصوّر حتى التسليم.",
    status: "awaiting_approval",
  },
  philosophy: { en: "", status: "missing" },
  expertise: {
    en: "Web applications — frontend and backend",
    ar: "تطبيقات الويب — الواجهات والخوادم",
    status: "confirmed",
  },
  audience: { en: "Freelance clients", ar: "عملاء العمل الحر", status: "confirmed" },
  location: { en: "", status: "missing" },
  quote: { en: "", status: "missing" },
  idCard: {
    header: { en: "DEVELOPER ID", ar: "هوية مطوّر", status: "confirmed" },
    backClosing: { en: "", status: "missing" },
  },
  avatarImage: "/portrait-bust.webp",
  heroPoster: "/hero/hero-poster.webp",
  heroVideo: { webm: "/hero/hero.webm", mp4: "/hero/hero.mp4" },
  resumeUrl: null,
};

/* ───────────────────────────── Navigation ───────────────────────────── */

export type SectionId =
  | "about"
  | "skills"
  | "work"
  | "certifications"
  | "experience"
  | "achievements"
  | "contact";

export interface NavItem {
  id: SectionId;
  label: Localized;
}

/** Default order. Sections without publishable content are removed at build time. */
export const NAV: NavItem[] = [
  { id: "about", label: { en: "About", ar: "نبذة" } },
  { id: "skills", label: { en: "Skills", ar: "المهارات" } },
  { id: "work", label: { en: "Work", ar: "الأعمال" } },
  { id: "certifications", label: { en: "Certifications", ar: "الشهادات" } },
  { id: "experience", label: { en: "Experience", ar: "الخبرة" } },
  { id: "achievements", label: { en: "Achievements", ar: "الإنجازات" } },
  { id: "contact", label: { en: "Contact", ar: "تواصل" } },
];

/* ───────────────────────────── Skills ───────────────────────────── */

export interface Skill {
  id: string;
  name: string;
  /** Short periodic-table symbol, 1–3 characters. */
  symbol: string;
  /** Key into the BRAND or CONCEPT maps in TechLogo. */
  logo?: string;
  /** Project ids that use this technology (owner-confirmed only). */
  projectIds?: string[];
  status: Status;
}

export interface SkillGroup {
  id: string;
  label: Localized;
  skills: Skill[];
}

/**
 * Owner chose these categories: Languages + Frontend, Backend + Databases,
 * Project management + concepts. The exact technologies are still missing,
 * so nothing is listed and the Skills section stays hidden until they arrive.
 */
export const SKILL_GROUPS: SkillGroup[] = [];

/* ───────────────────────────── Projects ───────────────────────────── */

export type ProjectKind = "website" | "web-mobile" | "mobile" | "system";

export const PROJECT_KINDS: Record<ProjectKind, Localized> = {
  website: { en: "Website", ar: "موقع إلكتروني" },
  "web-mobile": { en: "Website + Mobile App", ar: "موقع وتطبيق جوال" },
  mobile: { en: "Mobile App", ar: "تطبيق جوال" },
  system: { en: "System", ar: "نظام" },
};

export interface ProjectLink {
  label: "live" | "repo";
  url: string;
}

export interface Project {
  id: string;
  title: string;
  kind: ProjectKind;
  description: Copy;
  features: Copy[];
  technologies: string[];
  links: ProjectLink[];
  /** Real screenshot under /public/projects, if the owner supplies one. */
  screenshot: string | null;
  status: Status;
}

const missingCopy: Copy = { en: "", status: "missing" };

/**
 * Names, types and live links come from the owner's own project sheet.
 * Descriptions were drafted from what each public page shows and wait for approval.
 * Logistina and Masar El Nogoome have no public link in the sheet.
 */
export const PROJECTS: Project[] = [
  {
    id: "univolta",
    title: "UniVolta",
    kind: "website",
    description: {
      en: "A gateway to Egyptian universities, with university listings, an FAQ and contact pages.",
      ar: "بوابة للجامعات المصرية تضم قوائم الجامعات وصفحة للأسئلة الشائعة وصفحات للتواصل.",
      status: "awaiting_approval",
    },
    features: [],
    technologies: [],
    links: [{ label: "live", url: "https://uni-volta.com" }],
    screenshot: null,
    status: "confirmed",
  },
  {
    id: "v-fit",
    title: "V-Fit",
    kind: "web-mobile",
    description: missingCopy,
    features: [],
    technologies: [],
    links: [{ label: "live", url: "https://vfitapp.online/" }],
    screenshot: null,
    status: "confirmed",
  },
  {
    id: "lomi",
    title: "Lomi",
    kind: "web-mobile",
    description: {
      en: "An online shopping store serving customers in Egypt.",
      ar: "متجر إلكتروني للتسوق عبر الإنترنت لعملاء في مصر.",
      status: "awaiting_approval",
    },
    features: [],
    technologies: [],
    links: [{ label: "live", url: "https://lomi.com.eg/" }],
    screenshot: null,
    status: "confirmed",
  },
  {
    id: "nour-stream",
    title: "Nour Stream",
    kind: "website",
    description: {
      en: "An Arabic video streaming platform with a video library, live streaming, subscription plans and one account across phone, TV and web.",
      ar: "منصة عربية لبث الفيديو تضم مكتبة فيديو وبثًا مباشرًا وخطط اشتراك وحسابًا واحدًا على الجوال والتلفاز والويب.",
      status: "awaiting_approval",
    },
    features: [],
    technologies: [],
    links: [{ label: "live", url: "https://nourchannels.com/" }],
    screenshot: null,
    status: "confirmed",
  },
  {
    id: "rattel",
    title: "Rattel",
    kind: "system",
    description: {
      en: "A Quran memorization platform.",
      ar: "منصة لحفظ القرآن الكريم.",
      status: "awaiting_approval",
    },
    features: [],
    technologies: [],
    links: [{ label: "live", url: "https://rattelapp.com/" }],
    screenshot: null,
    status: "confirmed",
  },
  {
    id: "wasla",
    title: "Wasla E-Commerce",
    kind: "web-mobile",
    description: {
      en: "An online clothing store shipping across Saudi Arabia, with modest and traditional apparel, discounts and several payment options.",
      ar: "متجر إلكتروني للأزياء يشحن إلى جميع أنحاء المملكة العربية السعودية، ويضم أزياء محتشمة وتقليدية وخصومات وعدة خيارات للدفع.",
      status: "awaiting_approval",
    },
    features: [],
    technologies: [],
    links: [{ label: "live", url: "https://wasla-e-commerce.vercel.app/" }],
    screenshot: null,
    status: "confirmed",
  },
  {
    id: "logistina",
    title: "Logistina",
    kind: "system",
    description: missingCopy,
    features: [],
    technologies: [],
    links: [],
    screenshot: null,
    status: "confirmed",
  },
  {
    id: "masar-el-nogoome",
    title: "Masar El Nogoome",
    kind: "mobile",
    description: missingCopy,
    features: [],
    technologies: [],
    links: [],
    screenshot: null,
    status: "confirmed",
  },
];

/* ───────────────────── Experience, education & the rest ───────────────────── */

export interface ExperienceItem {
  id: string;
  organization: string;
  role: Copy;
  start: string;
  end: string | "present";
  details: Copy[];
  status: Status;
}

export interface EducationItem {
  id: string;
  institution: string;
  qualification: Copy;
  field?: Copy;
  start?: string;
  end: string;
  status: Status;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date?: string;
  url?: string;
  status: Status;
}

export interface Achievement {
  id: string;
  title: Copy;
  caption?: Copy;
  detail?: Copy;
  /** Exact, owner-confirmed figure. Never estimated. */
  figure?: { value: number; suffix?: string };
  logo?: string;
  status: Status;
}

/** Owner asked for Experience + Education. Details are pending (LinkedIn cannot be read automatically). */
export const EXPERIENCE: ExperienceItem[] = [];
export const EDUCATION: EducationItem[] = [];
/** Section excluded by the owner. */
export const CERTIFICATIONS: Certification[] = [];
/** Section excluded by the owner. */
export const ACHIEVEMENTS: Achievement[] = [];

/* ───────────────────────────── Links & contact ───────────────────────────── */

export type SocialKind = "github" | "linkedin" | "behance" | "dribbble" | "website";

export interface SocialLink {
  kind: SocialKind;
  url: string;
  handle: string;
  status: Status;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    kind: "github",
    url: "https://github.com/Jimmymgx/",
    handle: "Jimmymgx",
    status: "confirmed",
  },
  {
    kind: "linkedin",
    url: "https://www.linkedin.com/in/mohamed-gamal-developer/",
    handle: "mohamed-gamal-developer",
    status: "confirmed",
  },
];

export interface Contact {
  email: { value: string; status: Status };
  phone: { value: string; status: Status };
  whatsapp: { value: string; status: Status };
}

export const CONTACT: Contact = {
  email: { value: "mohamedgamal.01199@gmail.com", status: "confirmed" },
  phone: { value: "", status: "missing" },
  whatsapp: { value: "", status: "missing" },
};

/* ───────────────────────────── Site settings ───────────────────────────── */

export interface SiteSettings {
  /** Sections the owner wants. Excluded sections never render and leave the nav. */
  sections: Record<SectionId, boolean>;
  /** Production domain. Unknown until the owner provides it. */
  siteUrl: string | null;
  defaultLocale: "en" | "ar";
  analytics: null;
  /** Optional "Next — Your Team?" card at the end of the timeline. Needs approval. */
  showNextCard: boolean;
  meta: {
    title: Copy;
    description: Copy;
  };
}

export const SITE_SETTINGS: SiteSettings = {
  sections: {
    about: true,
    skills: true,
    work: true,
    certifications: false,
    experience: true,
    achievements: false,
    contact: true,
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  defaultLocale: "en",
  analytics: null,
  showNextCard: false,
  meta: {
    title: {
      en: "Mohamed Gamal — Fullstack Developer",
      ar: "محمد جمال — مطوّر Full Stack",
      status: "confirmed",
    },
    description: {
      en: "Mohamed Gamal is a fullstack developer and project manager building web applications, frontend and backend.",
      ar: "محمد جمال مطوّر Full Stack ومدير مشاريع يبني تطبيقات الويب بواجهاتها وخوادمها.",
      status: "awaiting_approval",
    },
  },
};

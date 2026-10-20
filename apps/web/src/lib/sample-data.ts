/**
 * SAMPLE CONTENT FOR LAYOUT TESTING ONLY. NOT REAL. NOT ABOUT THE OWNER.
 * Used only when NEXT_PUBLIC_SAMPLE_CONTENT=1 (a visible banner is shown).
 * Never enable this in production.
 */
import type {
  Achievement,
  Certification,
  EducationItem,
  ExperienceItem,
  SectionId,
  SkillGroup,
} from "./data";

const ok = "confirmed" as const;

export const SAMPLE: {
  skillGroups: SkillGroup[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: Certification[];
  achievements: Achievement[];
  sections: Partial<Record<SectionId, boolean>>;
} = {
  skillGroups: [
    {
      id: "lang",
      label: { en: "Languages", ar: "اللغات" },
      skills: [
        { id: "js", name: "JavaScript", symbol: "Js", logo: "javascript", projectIds: ["lomi"], status: ok },
        { id: "ts", name: "TypeScript", symbol: "Ts", logo: "typescript", status: ok },
        { id: "php", name: "PHP", symbol: "Ph", logo: "php", status: ok },
        { id: "py", name: "Python", symbol: "Py", logo: "python", status: ok },
      ],
    },
    {
      id: "front",
      label: { en: "Frontend", ar: "الواجهات" },
      skills: [
        { id: "react", name: "React", symbol: "Re", logo: "react", status: ok },
        { id: "next", name: "Next.js", symbol: "Nx", logo: "nextjs", status: ok },
        { id: "tw", name: "Tailwind CSS", symbol: "Tw", logo: "tailwindcss", status: ok },
        { id: "html", name: "HTML5", symbol: "Ht", logo: "html5", status: ok },
        { id: "css", name: "CSS3", symbol: "Cs", logo: "css3", status: ok },
      ],
    },
    {
      id: "back",
      label: { en: "Backend", ar: "الخوادم" },
      skills: [
        { id: "node", name: "Node.js", symbol: "Nd", logo: "nodejs", status: ok },
        { id: "lara", name: "Laravel", symbol: "Lv", logo: "laravel", status: ok },
        { id: "mysql", name: "MySQL", symbol: "My", logo: "mysql", status: ok },
        { id: "pg", name: "PostgreSQL", symbol: "Pg", logo: "postgresql", status: ok },
      ],
    },
    {
      id: "concepts",
      label: { en: "Concepts", ar: "مفاهيم" },
      skills: [
        { id: "pm", name: "Project Management", symbol: "Pm", logo: "project-management", status: ok },
        { id: "agile", name: "Agile", symbol: "Ag", logo: "agile", status: ok },
        { id: "api", name: "REST APIs", symbol: "Ap", logo: "api", status: ok },
      ],
    },
  ],
  experience: [
    {
      id: "e1",
      organization: "Sample Company A",
      role: { en: "Sample Role One", ar: "دور تجريبي أول", status: ok },
      start: "2022",
      end: "present",
      details: [{ en: "Sample responsibility text used only to test the layout.", ar: "نص تجريبي لاختبار التصميم فقط.", status: ok }],
      status: ok,
    },
    {
      id: "e2",
      organization: "Sample Company B",
      role: { en: "Sample Role Two", ar: "دور تجريبي ثانٍ", status: ok },
      start: "2020",
      end: "2022",
      details: [{ en: "Another sample line for the timeline layout.", ar: "سطر تجريبي آخر لتخطيط الجدول الزمني.", status: ok }],
      status: ok,
    },
  ],
  education: [
    {
      id: "d1",
      institution: "Sample University",
      qualification: { en: "Sample Degree", ar: "درجة تجريبية", status: ok },
      field: { en: "Sample Field", ar: "مجال تجريبي", status: ok },
      end: "2019",
      status: ok,
    },
  ],
  certifications: [
    { id: "c1", name: "Sample Certification One", issuer: "Sample Issuer", date: "2023", url: "https://example.com", status: ok },
    { id: "c2", name: "Sample Certification Two", issuer: "Sample Issuer", date: "2022", status: ok },
    { id: "c3", name: "Sample Certification Three", issuer: "Sample Issuer", status: ok },
  ],
  achievements: [
    { id: "a1", title: { en: "Sample achievement one", ar: "إنجاز تجريبي أول", status: ok }, caption: { en: "Sample caption", ar: "وصف تجريبي", status: ok }, figure: { value: 120, suffix: "+" }, logo: "react", status: ok },
    { id: "a2", title: { en: "Sample achievement two", ar: "إنجاز تجريبي ثانٍ", status: ok }, caption: { en: "Sample caption", ar: "وصف تجريبي", status: ok }, figure: { value: 8 }, logo: "nodejs", status: ok },
    { id: "a3", title: { en: "Sample achievement three", ar: "إنجاز تجريبي ثالث", status: ok }, caption: { en: "Sample caption", ar: "وصف تجريبي", status: ok }, figure: { value: 3, suffix: "x" }, logo: "typescript", status: ok },
    { id: "a4", title: { en: "Sample achievement four", ar: "إنجاز تجريبي رابع", status: ok }, caption: { en: "Sample caption", ar: "وصف تجريبي", status: ok }, logo: "nextjs", status: ok },
  ],
  sections: { certifications: true, achievements: true, skills: true, experience: true },
};

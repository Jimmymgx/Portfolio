import { notFound } from "next/navigation";
import App from "@/components/App";
import Hero from "@/components/hero/Hero";
import About from "@/components/sections/About";
import Achievements from "@/components/sections/Achievements";
import Certifications from "@/components/sections/Certifications";
import Contact from "@/components/sections/Contact";
import Experience from "@/components/sections/Experience";
import Footer from "@/components/sections/Footer";
import Skills, { type SkillView } from "@/components/sections/Skills";
import Work, { type ProjectView } from "@/components/sections/Work";
import {
  PROFILE,
  PROJECT_KINDS,
  SHOW_DRAFTS,
  getContent,
  getNav,
  isDraft,
  loc,
  txt,
} from "@/lib/content";
import type { SectionId } from "@/lib/data";
import { isLocale, ui, type Locale } from "@/lib/i18n";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = ui(locale);

  const content = getContent();
  const nav = getNav(content);
  const numberOf = (id: SectionId) => String(nav.findIndex((n) => n.id === id) + 1).padStart(2, "0");

  const name = txt(PROFILE.displayName, locale) ?? "";
  const first = txt(PROFILE.firstName, locale) ?? name.split(" ")[0] ?? "";
  const nameParts = name.split(" ");
  const nameLines = nameParts.length > 1 ? [nameParts.slice(0, -1).join(" "), nameParts[nameParts.length - 1]] : [name];

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

  const titleById: Record<string, string> = Object.fromEntries(content.projects.map((p) => [p.id, p.title]));
  const families = content.skillGroups.map((g) => ({ id: g.id, label: loc(g.label, locale) }));
  const skills: SkillView[] = content.skillGroups.flatMap((g) =>
    g.skills.map((sk) => ({
      id: sk.id,
      name: sk.name,
      symbol: sk.symbol,
      logo: sk.logo,
      familyId: g.id,
      familyLabel: loc(g.label, locale),
      projects: (sk.projectIds ?? []).map((id) => titleById[id]).filter(Boolean),
    })),
  );

  const links = nav.map((n) => ({ id: n.id, label: loc(n.label, locale), number: numberOf(n.id) }));

  return (
    <App
      locale={locale}
      links={links}
      name={name}
      initials={PROFILE.initials}
      otherLocaleHref={locale === "en" ? "/ar" : "/en"}
      banner={content.sample ? "sample" : SHOW_DRAFTS ? "draft" : null}
    >
      <main id="main">
        <Hero
          locale={locale}
          nameLines={nameLines}
          ghost={first}
          title={txt(PROFILE.title, locale) ?? ""}
          roleLine={txt(PROFILE.roleLine, locale)}
          intro={txt(PROFILE.intro, locale)}
          introDraft={isDraft(PROFILE.intro.status)}
          poster={PROFILE.heroPoster}
          video={PROFILE.heroVideo}
          hasWork={content.sections.work}
          resumeUrl={PROFILE.resumeUrl}
        />
        {content.sections.about && <About locale={locale} content={content} number={numberOf("about")} />}
        {content.sections.skills && (
          <Skills locale={locale} number={numberOf("skills")} families={families} skills={skills} />
        )}
        {content.sections.work && <Work locale={locale} number={numberOf("work")} projects={projects} />}
        {content.sections.certifications && (
          <Certifications locale={locale} number={numberOf("certifications")} items={content.certifications} />
        )}
        {content.sections.experience && (
          <Experience locale={locale} content={content} number={numberOf("experience")} />
        )}
        {content.sections.achievements && (
          <Achievements locale={locale} number={numberOf("achievements")} items={content.achievements} />
        )}
        {content.sections.contact && (
          <Contact
            locale={locale}
            number={numberOf("contact")}
            email={content.email}
            links={content.social.map((l) => ({ kind: l.kind, url: l.url, handle: l.handle }))}
          />
        )}
      </main>
      <Footer locale={locale} name={name} />
    </App>
  );
}

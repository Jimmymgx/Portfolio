import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import App from "@/components/App";
import Hero from "@/components/hero/Hero";
import About from "@/components/sections/About";
import Achievements from "@/components/sections/Achievements";
import Certifications from "@/components/sections/Certifications";
import Contact from "@/components/sections/Contact";
import Experience from "@/components/sections/Experience";
import Footer from "@/components/sections/Footer";
import Maintenance from "@/components/sections/Maintenance";
import Skills from "@/components/sections/Skills";
import Work from "@/components/sections/Work";
import { BROWSER_API_URL } from "@/lib/api";
import type { SectionId } from "@/lib/data";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSiteModel } from "@/lib/site-model";

/** Safety net: even if a cache-tag refresh is missed, the page refreshes itself within five minutes. */
export const revalidate = 300;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const m = await getSiteModel(locale);

  if (m.maintenance) return <Maintenance locale={locale} name={m.name} />;

  const numberOf = (id: SectionId) => String(m.sections.findIndex((s) => s.id === id) + 1).padStart(2, "0");
  const links = m.sections.map((s) => ({ id: s.id, label: s.label, number: numberOf(s.id) }));
  const hasWork = m.sections.some((s) => s.id === "work");

  /** Controlled registry: the database only chooses the order and visibility of these known sections. */
  const registry: Record<SectionId, () => ReactNode> = {
    about: () => <About key="about" locale={locale} number={numberOf("about")} data={m.about} />,
    skills: () => <Skills key="skills" locale={locale} number={numberOf("skills")} families={m.skills.families} skills={m.skills.items} />,
    work: () => <Work key="work" locale={locale} number={numberOf("work")} projects={m.projects} />,
    certifications: () => <Certifications key="certifications" locale={locale} number={numberOf("certifications")} items={m.certifications} />,
    experience: () => <Experience key="experience" locale={locale} number={numberOf("experience")} items={m.timeline} showNextCard={m.showNextCard} />,
    achievements: () => <Achievements key="achievements" locale={locale} number={numberOf("achievements")} items={m.achievements} />,
    contact: () => (
      <Contact
        key="contact"
        locale={locale}
        number={numberOf("contact")}
        email={m.contact.email}
        phone={m.contact.phone}
        whatsappUrl={m.contact.whatsappUrl}
        links={m.contact.links}
        headline={m.contact.headline}
        intro={m.contact.intro}
        formApiUrl={m.contact.formEnabled ? BROWSER_API_URL : null}
      />
    ),
  };

  return (
    <App
      locale={locale}
      links={links}
      name={m.name}
      initials={m.initials}
      otherLocaleHref={locale === "en" ? "/ar" : "/en"}
      banner={m.banner}
    >
      <main id="main">
        {m.showHero && (
          <Hero
            locale={locale}
            nameLines={m.nameLines}
            ghost={m.ghost}
            title={m.title}
            roleLine={m.roleLine}
            intro={m.intro}
            introDraft={m.introDraft}
            poster={m.poster}
            video={m.video}
            audioEnabled={m.audioEnabled}
            hasWork={hasWork}
            resumeUrl={m.resumeUrl}
            primaryCta={m.primaryCta}
            secondaryCta={m.secondaryCta}
          />
        )}
        {m.sections.map((s) => registry[s.id]())}
      </main>
      <Footer locale={locale} name={m.name} text={m.footerText} />
    </App>
  );
}

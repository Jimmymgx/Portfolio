import { Reveal } from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { ui, type Locale } from "@/lib/i18n";
import IdCard, { type IdCardData } from "./IdCard";
import s from "./About.module.css";

/** Everything the About section shows, already resolved for one language. */
export interface AboutModel {
  lead: string | null;
  leadDraft: boolean;
  philosophy: string | null;
  quote: string | null;
  facts: { k: string; v: string; href?: string }[];
  links: { id: string; label: string; url: string }[];
  resumeUrl: string | null;
  showIdCard: boolean;
  card: IdCardData;
}

export default function About({ locale, number, data }: { locale: Locale; number: string; data: AboutModel }) {
  const t = ui(locale);
  const { lead, leadDraft, philosophy, quote, facts, links, resumeUrl, showIdCard, card } = data;

  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="container-x">
        <div className={`${s.grid} ${showIdCard ? "" : s.noCard}`}>
          <div className={s.left}>
            <SectionHeading id="about-title" number={number} label={t.aboutLabel} lines={t.aboutTitle} />
            {lead && (
              <Reveal as="p" i={1} className={`lede ${s.lead}`}>
                {lead}
                {leadDraft && <span className="draft-tag">{t.draft}</span>}
              </Reveal>
            )}
            {philosophy && (
              <Reveal as="p" i={2} className={s.para}>
                {philosophy}
              </Reveal>
            )}
            {(links.length > 0 || resumeUrl) && (
              <Reveal i={3} className={s.links}>
                {links.map((l) => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    {l.label}
                    <span className="sr-only"> {t.opensNewTab}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M8 7h9v9" />
                    </svg>
                  </a>
                ))}
                {resumeUrl && (
                  <a href={resumeUrl} className="btn btn-primary" download>
                    {t.resume}
                  </a>
                )}
              </Reveal>
            )}
          </div>

          {showIdCard && (
            <Reveal i={1} className={s.center}>
              <IdCard locale={locale} data={card} />
            </Reveal>
          )}

          <div className={s.right}>
            {facts.length > 0 && (
              <Reveal i={2}>
                <h3 className="eyebrow">{t.quickFacts}</h3>
                <dl className={s.facts}>
                  {facts.map((f) => (
                    <div key={f.k + f.v} className={s.fact}>
                      <dt>{f.k}</dt>
                      <dd>{f.href ? <a href={f.href}>{f.v}</a> : f.v}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
            {quote && (
              <Reveal as="blockquote" i={3} className={s.quote}>
                {quote}
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

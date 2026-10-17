import { Reveal } from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { PROFILE, isDraft, txt, type Content } from "@/lib/content";
import { ui, type Locale } from "@/lib/i18n";
import IdCard from "./IdCard";
import s from "./About.module.css";

const SOCIAL_LABEL = {
  github: "github",
  linkedin: "linkedin",
  behance: "behance",
  dribbble: "dribbble",
  website: "website",
} as const;

export default function About({
  locale,
  content,
  number,
}: {
  locale: Locale;
  content: Content;
  number: string;
}) {
  const t = ui(locale);
  const name = txt(PROFILE.displayName, locale) ?? "";
  const title = txt(PROFILE.title, locale) ?? "";
  const roleLine = txt(PROFILE.roleLine, locale);
  const expertise = txt(PROFILE.expertise, locale);
  const audience = txt(PROFILE.audience, locale);
  const location = txt(PROFILE.location, locale);
  const bio = txt(PROFILE.bio, locale);
  const summary = txt(PROFILE.summary, locale);
  const philosophy = txt(PROFILE.philosophy, locale);
  const quote = txt(PROFILE.quote, locale);
  const lead = bio ?? summary;
  const leadDraft = bio ? isDraft(PROFILE.bio.status) : isDraft(PROFILE.summary.status);

  const facts: { k: string; v: string; href?: string }[] = [];
  if (location) facts.push({ k: t.location, v: location });
  if (roleLine) facts.push({ k: t.role, v: roleLine });
  if (expertise) facts.push({ k: t.expertise, v: expertise });
  if (audience) facts.push({ k: t.audience, v: audience });
  if (content.email) facts.push({ k: t.email, v: content.email, href: `mailto:${content.email}` });

  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="container-x">
        <div className={s.grid}>
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
            {(content.social.length > 0 || PROFILE.resumeUrl) && (
              <Reveal i={3} className={s.links}>
                {content.social.map((l) => (
                  <a
                    key={l.kind}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                  >
                    {t[SOCIAL_LABEL[l.kind]]}
                    <span className="sr-only"> {t.opensNewTab}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M8 7h9v9" />
                    </svg>
                  </a>
                ))}
                {PROFILE.resumeUrl && (
                  <a href={PROFILE.resumeUrl} className="btn btn-primary" download>
                    {t.resume}
                  </a>
                )}
              </Reveal>
            )}
          </div>

          <Reveal i={1} className={s.center}>
            <IdCard
              locale={locale}
              data={{
                header: txt(PROFILE.idCard.header, locale) ?? "ID",
                name,
                role: title,
                avatar: PROFILE.avatarImage,
                expertise,
                roleLine,
                email: content.email,
                projects: content.projects.slice(0, 3).map((p) => p.title),
                closing: txt(PROFILE.idCard.backClosing, locale),
              }}
            />
          </Reveal>

          <div className={s.right}>
            {facts.length > 0 && (
              <Reveal i={2}>
                <h3 className="eyebrow">{t.quickFacts}</h3>
                <dl className={s.facts}>
                  {facts.map((f) => (
                    <div key={f.k} className={s.fact}>
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

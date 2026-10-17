import SectionHeading from "@/components/ui/SectionHeading";
import { isDraft, txt, type Content } from "@/lib/content";
import { SITE_SETTINGS } from "@/lib/data";
import { ui, type Locale } from "@/lib/i18n";
import Timeline, { type TimelineItem } from "./Timeline";
import s from "./Experience.module.css";

export default function Experience({
  locale,
  content,
  number,
}: {
  locale: Locale;
  content: Content;
  number: string;
}) {
  const t = ui(locale);

  const work = content.experience.map((e) => ({
    sort: e.end === "present" ? 9999 : Number.parseInt(e.end, 10) || 0,
    start: Number.parseInt(e.start, 10) || 0,
    item: {
      id: `w-${e.id}`,
      date: `${e.start} — ${e.end === "present" ? t.present : e.end}`,
      title: txt(e.role, locale) ?? "",
      org: e.organization,
      details: e.details.map((d) => txt(d, locale)).filter(Boolean) as string[],
      kind: "work" as const,
      draft: isDraft(e.status) || isDraft(e.role.status),
    },
  }));

  const edu = content.education.map((e) => ({
    sort: Number.parseInt(e.end, 10) || 0,
    start: Number.parseInt(e.start ?? e.end, 10) || 0,
    item: {
      id: `e-${e.id}`,
      date: e.start ? `${e.start} — ${e.end}` : e.end,
      title: [txt(e.qualification, locale), e.field ? txt(e.field, locale) : null].filter(Boolean).join(" · "),
      org: e.institution,
      details: [],
      kind: "edu" as const,
      draft: isDraft(e.status) || isDraft(e.qualification.status),
    },
  }));

  // Newest first.
  const items: TimelineItem[] = [...work, ...edu]
    .sort((a, b) => b.sort - a.sort || b.start - a.start)
    .map((x) => x.item);

  return (
    <section id="experience" className="section" aria-labelledby="experience-title">
      <div className="container-x">
        <SectionHeading id="experience-title" number={number} label={t.expLabel} lines={t.expTitle} />
        <div className={s.legend} aria-hidden="true">
          <span>● {locale === "ar" ? "الخبرة" : "Work"}</span>
          <span>◆ {locale === "ar" ? "التعليم" : "Education"}</span>
        </div>
        <Timeline
          items={items}
          draftLabel={t.draft}
          next={SITE_SETTINGS.showNextCard ? [...t.nextCard] : null}
          nextHref="#contact"
        />
      </div>
    </section>
  );
}

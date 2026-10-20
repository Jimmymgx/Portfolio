import SectionHeading from "@/components/ui/SectionHeading";
import { ui, type Locale } from "@/lib/i18n";
import Timeline, { type TimelineItem } from "./Timeline";
import s from "./Experience.module.css";

export default function Experience({
  locale,
  number,
  items,
  showNextCard,
}: {
  locale: Locale;
  number: string;
  /** Experience and education, merged and sorted newest first. */
  items: TimelineItem[];
  showNextCard: boolean;
}) {
  const t = ui(locale);
  return (
    <section id="experience" className="section" aria-labelledby="experience-title">
      <div className="container-x">
        <SectionHeading id="experience-title" number={number} label={t.expLabel} lines={t.expTitle} />
        <div className={s.legend} aria-hidden="true">
          <span>● {locale === "ar" ? "الخبرة" : "Work"}</span>
          <span>◆ {locale === "ar" ? "التعليم" : "Education"}</span>
        </div>
        <Timeline items={items} draftLabel={t.draft} next={showNextCard ? [...t.nextCard] : null} nextHref="#contact" />
      </div>
    </section>
  );
}

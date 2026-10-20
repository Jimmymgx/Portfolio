import { Reveal } from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { type Locale } from "@/lib/i18n";
import s from "./Certifications.module.css";

const COPY = {
  en: { label: "Certifications", title: ["Proof of", "practice."], count: "Certifications", verify: "Verify" },
  ar: { label: "الشهادات", title: ["إثبات", "الممارسة."], count: "شهادة", verify: "تحقق" },
} as const;

export interface CertView {
  id: string | number;
  name: string;
  issuer: string;
  date?: string | null;
  url?: string | null;
}

const Arrow = () => (
  <svg className={s.arrow} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Certifications({
  locale,
  number,
  items,
}: {
  locale: Locale;
  number: string;
  items: CertView[];
}) {
  const c = COPY[locale];
  return (
    <section id="certifications" className={`section ${s.band}`} aria-labelledby="certifications-title">
      <div className={`container-x ${s.grid}`}>
        <div className={s.side}>
          <SectionHeading id="certifications-title" number={number} label={c.label} lines={c.title} />
          <Reveal i={1} className={s.count}>
            <span>{String(items.length).padStart(2, "0")}</span> {c.count}
          </Reveal>
        </div>

        <ol className={s.list}>
          {items.map((it, n) => {
            const inner = (
              <>
                <span className={s.idx}>{String(n + 1).padStart(2, "0")}</span>
                <span className={s.name}>{it.name}</span>
                <span className={s.issuer}>{it.issuer}</span>
                <span className={s.date}>{it.date ?? ""}</span>
                <Arrow />
              </>
            );
            return (
              <Reveal as="li" key={it.id} i={n}>
                {it.url ? (
                  <a
                    className={s.row}
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${it.name}, ${it.issuer} — ${c.verify}`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className={s.row}>{inner}</div>
                )}
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

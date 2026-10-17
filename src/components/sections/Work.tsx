"use client";

import { useEffect, useRef, useState } from "react";
import MiniUI from "@/components/ui/MiniUI";
import SectionHeading from "@/components/ui/SectionHeading";
import type { ProjectKind } from "@/lib/data";
import { ui, type Locale } from "@/lib/i18n";
import s from "./Work.module.css";

export interface ProjectView {
  id: string;
  title: string;
  kind: ProjectKind;
  kindLabel: string;
  description: string | null;
  descriptionDraft: boolean;
  features: string[];
  technologies: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  screenshot: string | null;
}

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export default function Work({
  locale,
  number,
  projects,
}: {
  locale: Locale;
  number: string;
  projects: ProjectView[];
}) {
  const t = ui(locale);
  const [active, setActive] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  // Small intent delay so sweeping the pointer across panels does not thrash the layout.
  const hoverIn = (i: number) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(i), 90);
  };
  const hoverOut = () => {
    if (timer.current) window.clearTimeout(timer.current);
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const horizontal = window.matchMedia("(min-width: 1024px)").matches;
    const rtl = document.documentElement.dir === "rtl";
    const next = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    const prev = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    let to = -1;
    if (e.key === next) to = Math.min(projects.length - 1, i + 1);
    else if (e.key === prev) to = Math.max(0, i - 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = projects.length - 1;
    if (to >= 0) {
      e.preventDefault();
      document.getElementById(`tab-${projects[to].id}`)?.focus();
    }
  };

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="container-x">
        <SectionHeading id="work-title" number={number} label={t.workLabel} lines={t.workTitle} />

        <div className={`${s.gallery} rv`} style={{ ["--i" as string]: 1 }}>
          {projects.map((p, i) => {
            const on = i === active;
            const n = String(i + 1).padStart(2, "0");
            return (
              <article key={p.id} className={`${s.panel} ${on ? s.on : ""}`} onPointerEnter={(e) => e.pointerType === "mouse" && hoverIn(i)} onPointerLeave={hoverOut}>
                <button
                  type="button"
                  id={`tab-${p.id}`}
                  className={s.tab}
                  aria-expanded={on}
                  aria-controls={`panel-${p.id}`}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <span className={s.tnum}>{n}</span>
                  <span className={s.ttitle}>{p.title}</span>
                  <span className={s.plus} aria-hidden="true" />
                </button>

                <div
                  id={`panel-${p.id}`}
                  role="region"
                  aria-labelledby={`tab-${p.id}`}
                  className={s.body}
                  inert={!on}
                >
                  <div className={s.inner}>
                    <div className={s.text}>
                      <p className={s.meta}>
                        <span>{n}</span>
                        <span className="chip">{p.kindLabel}</span>
                      </p>
                      <h3 className={s.title}>{p.title}</h3>
                      {p.description && (
                        <p className={s.desc}>
                          {p.description}
                          {p.descriptionDraft && <span className="draft-tag">{t.draft}</span>}
                        </p>
                      )}
                      {p.features.length > 0 && (
                        <div>
                          <p className={s.sub}>{t.features}</p>
                          <ul className={s.features}>
                            {p.features.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {p.technologies.length > 0 && (
                        <div>
                          <p className={s.sub}>{t.technologies}</p>
                          <ul className={s.chips}>
                            {p.technologies.map((x) => (
                              <li key={x} className="chip">
                                {x}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(p.liveUrl || p.repoUrl) && (
                        <div className={s.links}>
                          {p.liveUrl && (
                            <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                              {t.liveSite}
                              <span className="sr-only"> — {p.title} {t.opensNewTab}</span>
                              <Arrow />
                            </a>
                          )}
                          {p.repoUrl && (
                            <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                              {t.repo}
                              <span className="sr-only"> — {p.title} {t.opensNewTab}</span>
                              <Arrow />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={s.visual}>
                      {p.screenshot ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.screenshot} alt={`${p.title}`} loading="lazy" className={s.shot} />
                      ) : (
                        <MiniUI kind={p.kind} caption={t.illustrative} />
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

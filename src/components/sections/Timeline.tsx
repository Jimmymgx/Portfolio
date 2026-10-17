"use client";

import { useEffect, useRef } from "react";
import { Reveal } from "@/components/ui/Reveal";
import s from "./Experience.module.css";

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  org: string;
  details: string[];
  kind: "work" | "edu";
  draft: boolean;
}

export default function Timeline({
  items,
  draftLabel,
  next,
  nextHref,
}: {
  items: TimelineItem[];
  draftLabel: string;
  next: string[] | null;
  nextHref: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  // Scroll-driven spine: written straight to the DOM, no React re-renders.
  useEffect(() => {
    const list = listRef.current;
    const fill = fillRef.current;
    if (!list || !fill) return;
    const stops = Array.from(list.querySelectorAll<HTMLElement>("[data-stop]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = list.getBoundingClientRect();
      const reach = Math.min(r.height, Math.max(0, window.innerHeight * 0.62 - r.top));
      fill.style.transform = `scaleY(${r.height ? reach / r.height : 0})`;
      for (const st of stops) {
        st.classList.toggle(s.reached, st.offsetTop + 34 <= reach);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={s.wrap}>
      <div className={s.list} ref={listRef}>
        <span className={s.spine} aria-hidden="true">
          <span className={s.fill} ref={fillRef} />
        </span>
        <ol className={s.items}>
        {items.map((it) => (
          <li key={it.id} className={s.item} data-stop>
            <span className={s.dot} aria-hidden="true" />
            <Reveal i={0} className={s.date}>
              <span className={s.kind}>{it.kind === "edu" ? "◆" : "●"}</span> {it.date}
            </Reveal>
            <Reveal i={1} className={`card ${s.card}`}>
              <h3 className={s.role}>
                {it.title}
                {it.draft && <span className="draft-tag">{draftLabel}</span>}
              </h3>
              <p className={s.org}>{it.org}</p>
              {it.details.length > 0 && (
                <ul className={s.details}>
                  {it.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </Reveal>
          </li>
        ))}
        {next && (
          <li className={s.item} data-stop>
            <span className={s.dot} aria-hidden="true" />
            <span />
            <Reveal i={1}>
              <a href={nextHref} className={s.next}>
                <span>{next[0]}</span>
                <span className="accent">{next[1]}</span>
              </a>
            </Reveal>
          </li>
        )}
        </ol>
      </div>
    </div>
  );
}

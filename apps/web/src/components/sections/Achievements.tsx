"use client";

import { useEffect, useRef } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import TechLogo, { brandGlow } from "@/components/ui/TechLogo";
import { txt } from "@/lib/content";
import type { Achievement } from "@/lib/data";
import { useReducedMotion } from "@/lib/hooks";
import type { Locale } from "@/lib/i18n";
import s from "./Achievements.module.css";

const COPY = {
  en: { label: "Achievements", title: ["Moments", "worth noting."], progress: "Scroll progress" },
  ar: { label: "الإنجازات", title: ["لحظات", "تستحق الذكر."], progress: "تقدم التمرير" },
} as const;

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

export default function Achievements({
  locale,
  number,
  items,
}: {
  locale: Locale;
  number: string;
  items: Achievement[];
}) {
  const c = COPY[locale];
  const reduce = useReducedMotion();
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const o = outer.current;
    const tr = track.current;
    if (!o || !tr) return;
    const cards = Array.from(tr.querySelectorAll<HTMLElement>("[data-card]"));
    const counted = new WeakSet<Element>();

    const count = (card: HTMLElement) => {
      const el = card.querySelector<HTMLElement>("[data-count]");
      if (!el || counted.has(el)) return;
      counted.add(el);
      const target = Number(el.dataset.count);
      if (reduce) {
        el.textContent = String(target);
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 1400);
        el.textContent = String(Math.round(target * easeOutQuart(p)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (reduce) {
      cards.forEach(count);
      return;
    }

    const rtl = document.documentElement.dir === "rtl";
    let raf = 0;
    let travel = 0;

    const size = () => {
      travel = Math.max(0, tr.scrollWidth - window.innerWidth);
      o.style.height = `${window.innerHeight + travel}px`;
    };

    const update = () => {
      raf = 0;
      const r = o.getBoundingClientRect();
      const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
      tr.style.transform = `translate3d(${(rtl ? 1 : -1) * p * travel}px,0,0)`;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;

      const mid = window.innerWidth / 2;
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      for (const card of cards) {
        const b = card.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const d = Math.abs(cx - mid);
        if (d < bestD) {
          bestD = d;
          best = card;
        }
        if (b.left < window.innerWidth * 0.92 && b.right > 0 && r.top < window.innerHeight && r.bottom > 0) count(card);
      }
      cards.forEach((card) => card.classList.toggle(s.active, card === best));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      size();
      onScroll();
    };

    size();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      o.style.height = "";
      tr.style.transform = "";
    };
  }, [reduce, items.length]);

  return (
    <section id="achievements" className={s.section} aria-labelledby="achievements-title">
      <div className={s.outer} ref={outer}>
        <div className={s.sticky}>
          <div className={`container-x ${s.head}`}>
            <SectionHeading id="achievements-title" number={number} label={c.label} lines={c.title} />
          </div>

          <ul className={s.track} ref={track}>
            {items.map((a, n) => {
              const title = txt(a.title, locale);
              const caption = a.caption ? txt(a.caption, locale) : null;
              const detail = a.detail ? txt(a.detail, locale) : null;
              const glow = brandGlow(a.logo);
              return (
                <li
                  key={a.id}
                  data-card
                  className={s.card}
                  style={glow ? ({ ["--glow" as string]: glow } as React.CSSProperties) : undefined}
                >
                  <div className={s.top}>
                    <span className={s.logo}>
                      <TechLogo logo={a.logo} symbol={String(n + 1)} size={34} />
                    </span>
                    <span className={s.idx}>{String(n + 1).padStart(2, "0")}</span>
                  </div>
                  <div className={s.mid}>
                    <h3 className={s.title}>{title}</h3>
                    {caption && <p className={s.caption}>{caption}</p>}
                    {detail && <p className={s.detail}>{detail}</p>}
                  </div>
                  {a.figure && (
                    <p className={s.figure}>
                      <span data-count={a.figure.value}>{reduce ? a.figure.value : 0}</span>
                      {a.figure.suffix}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <div
            className={s.progress}
            aria-hidden="true"
          >
            <span ref={bar} />
          </div>
        </div>
      </div>
    </section>
  );
}

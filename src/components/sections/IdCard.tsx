"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "@/lib/hooks";
import { ui, type Locale } from "@/lib/i18n";
import { useScroll } from "@/lib/scroll";
import s from "./IdCard.module.css";

export interface IdCardData {
  header: string;
  name: string;
  role: string;
  avatar: string;
  expertise: string | null;
  roleLine: string | null;
  email: string | null;
  projects: string[];
  closing: string | null;
}

/** Deterministic decorative barcode (no real data encoded). */
function bars(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out: { x: number; w: number }[] = [];
  let x = 0;
  while (x < 196) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const w = 1 + (h % 4);
    out.push({ x, w });
    x += w + 1 + ((h >>> 8) % 3);
  }
  return out;
}

export default function IdCard({ locale, data }: { locale: Locale; data: IdCardData }) {
  const t = ui(locale);
  const reduce = useReducedMotion();
  const { scrollTo } = useScroll();
  const [flipped, setFlipped] = useState(false);
  const [wrapRef, inView] = useInView<HTMLDivElement>(0.1);
  const rigRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mutable physics state lives outside React.
  const phys = useRef({ a: 0, w: 0, drag: false, dragTarget: 0, sx: 0, sy: 0, moved: 0, cx: 0 });
  const barcode = useMemo(() => bars(data.name), [data.name]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    if (reduce || !inView) {
      if (reduce) rig.style.transform = "rotate(0deg)";
      return;
    }
    let raf = 0;
    let last = performance.now();
    const p = phys.current;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      // Damped pendulum toward an idle sway (or toward the pointer while dragging).
      const idle = 1.6 * Math.sin(now / 1100) + 0.7 * Math.sin(now / 470 + 1.3);
      const target = p.drag ? p.dragTarget : idle;
      const k = p.drag ? 140 : 24;
      const c = p.drag ? 18 : 1.5;
      const acc = -k * (p.a - target) - c * p.w;
      p.w += acc * dt;
      p.a += p.w * dt;
      p.a = Math.max(-38, Math.min(38, p.a));
      rig.style.transform = `rotate(${p.a.toFixed(3)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce, inView]);

  const onPointerMove = (e: React.PointerEvent) => {
    const p = phys.current;
    if (p.drag) {
      const r = cardRef.current?.getBoundingClientRect();
      const cx = r ? r.left + r.width / 2 : p.cx;
      p.dragTarget = Math.max(-28, Math.min(28, (e.clientX - cx) / 5));
      p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.sx, e.clientY - p.sy));
      return;
    }
    if (e.pointerType === "mouse" || e.pointerType === "pen") {
      // Pointer velocity nudges the swing.
      p.w = Math.max(-260, Math.min(260, p.w + e.movementX * 5));
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    const p = phys.current;
    p.drag = true;
    p.sx = e.clientX;
    p.sy = e.clientY;
    p.moved = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const endDrag = (e: React.PointerEvent) => {
    const p = phys.current;
    if (!p.drag) return;
    p.drag = false;
    // Give the release a little extra swing.
    p.w += p.dragTarget * 4;
    if (p.moved < 6 && !(e.target as HTMLElement).closest("a")) setFlipped((f) => !f);
  };

  return (
    <div className={s.wrap} ref={wrapRef}>
      <div className={s.hook} aria-hidden="true" />
      <div className={s.rig} ref={rigRef}>
        <div className={s.strap} aria-hidden="true">
          <span>{data.header} • {data.name} • {data.header} • {data.name} •</span>
        </div>
        <div className={s.clip} aria-hidden="true">
          <i />
        </div>

        <div
          className={s.card}
          ref={cardRef}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className={`${s.flip} ${flipped ? s.flipped : ""}`}>
            {/* FRONT */}
            <section
              className={`${s.face} ${s.front}`}
              aria-label={t.cardFront}
              aria-hidden={flipped}
              inert={flipped}
            >
              <header className={s.head}>
                <span className={s.slot} aria-hidden="true" />
                <span className={s.headLabel}>{data.header}</span>
              </header>
              <div className={s.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.avatar} alt={`${data.name}, ${t.avatarNote}`} width={768} height={960} draggable={false} />
                <span className={s.holo} aria-hidden="true" />
                <span className={s.avatarTag}>{t.avatarNote}</span>
              </div>
              <div className={s.id}>
                <p className={s.idName}>{data.name}</p>
                <p className={s.idRole}>{data.role}</p>
              </div>
              <svg className={s.barcode} viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true">
                {barcode.map((b, i) => (
                  <rect key={i} x={b.x} y="0" width={b.w} height="30" />
                ))}
              </svg>
            </section>

            {/* BACK */}
            <section
              className={`${s.face} ${s.back}`}
              aria-label={t.cardBack}
              aria-hidden={!flipped}
              inert={!flipped}
            >
              <header className={s.head}>
                <span className={s.slot} aria-hidden="true" />
                <span className={s.headLabel}>{data.name}</span>
              </header>
              <dl className={s.details}>
                {data.expertise && (
                  <div>
                    <dt>{t.expertise}</dt>
                    <dd>{data.expertise}</dd>
                  </div>
                )}
                {data.roleLine && (
                  <div>
                    <dt>{t.role}</dt>
                    <dd>{data.roleLine}</dd>
                  </div>
                )}
                {data.projects.length > 0 && (
                  <div>
                    <dt>{t.cardSelected}</dt>
                    <dd>{data.projects.join(" · ")}</dd>
                  </div>
                )}
                {data.email && (
                  <div>
                    <dt>{t.email}</dt>
                    <dd>
                      <a href={`mailto:${data.email}`} className={s.mail}>
                        {data.email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              <div className={s.closing}>
                {data.closing ? (
                  <p>{data.closing}</p>
                ) : (
                  <a
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo("#contact");
                    }}
                  >
                    {t.letsTalk} →
                  </a>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={s.flipBtn}
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? t.flipBack : t.flipCard}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        <span>{t.cardHint}</span>
      </button>
    </div>
  );
}

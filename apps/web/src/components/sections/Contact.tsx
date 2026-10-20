"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";
import { ui, type Locale } from "@/lib/i18n";
import s from "./Contact.module.css";

export interface ContactLink {
  kind: "github" | "linkedin" | "behance" | "dribbble" | "website";
  url: string;
  handle: string;
}

interface Props {
  locale: Locale;
  number: string;
  email: string | null;
  links: ContactLink[];
}

export default function Contact({ locale, number, email, links }: Props) {
  const t = ui(locale);
  const reduce = useReducedMotion();
  const headRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<number | null>(null);

  // Letters (words in Arabic, to keep cursive joining intact) hop away from the pointer.
  useEffect(() => {
    const head = headRef.current;
    if (!head || reduce) return;
    const units = Array.from(head.querySelectorAll<HTMLElement>("[data-u]"));
    let px = 0;
    let py = 0;
    let raf = 0;
    let inside = false;

    const frame = () => {
      for (const u of units) {
        const r = u.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const k = Math.max(0, 1 - d / 150);
        u.style.setProperty("--hop", `${(-26 * k * k).toFixed(1)}px`);
      }
      raf = inside ? requestAnimationFrame(frame) : 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      if (!inside) {
        inside = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const leave = () => {
      inside = false;
      cancelAnimationFrame(raf);
      units.forEach((u) => u.style.setProperty("--hop", "0px"));
    };
    head.addEventListener("pointermove", move);
    head.addEventListener("pointerleave", leave);
    return () => {
      head.removeEventListener("pointermove", move);
      head.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  const copy = useCallback(async () => {
    if (!email) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(email);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setCopied(ok ? "ok" : "fail");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied("idle"), 2400);
  }, [email]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const words = t.contactHeadline;
  const splitLetters = locale !== "ar";
  const full = words.join(" ");
  // English: one word per line, hopping per letter. Arabic: two lines, hopping per word (keeps letters joined).
  const lines: string[][] = splitLetters ? words.map((w) => [w]) : [words.slice(0, 2) as string[], words.slice(2) as string[]];

  return (
    <section id="contact" className={`section ${s.section}`} aria-labelledby="contact-title">
      <div className="container-x">
        <p className="eyebrow rv">
          {number} — {t.contactLabel}
        </p>

        <div className={s.top}>
          <h2 id="contact-title" ref={headRef} className={s.headline} aria-label={full}>
            {lines.map((line, li) => (
              <span key={li} className={s.line} aria-hidden="true">
                {splitLetters
                  ? Array.from(line[0]).map((ch, ci) => (
                      <span key={ci} data-u className={s.unit}>
                        {ch === " " ? " " : ch}
                      </span>
                    ))
                  : line.map((w, wi) => (
                      <span key={wi}>
                        {wi > 0 && " "}
                        <span data-u className={s.unit}>
                          {w}
                        </span>
                      </span>
                    ))}
              </span>
            ))}
          </h2>

          <div className={s.badge} aria-hidden="true">
            <svg viewBox="0 0 200 200">
              <defs>
                <path id="circ" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
              </defs>
              <text>
                <textPath href="#circ" startOffset="0">
                  {t.sayHello}
                </textPath>
              </text>
            </svg>
            <span className={s.arrow}>↗</span>
          </div>
        </div>

        <div className={s.channels}>
          <p className={`${s.intro} rv`} style={{ ["--i" as string]: 1 }}>
            {t.contactIntro}
          </p>

          <ul className={s.list}>
            {email && (
              <li className={`${s.row} rv`} style={{ ["--i" as string]: 2 }}>
                <span className={s.k}>{t.email}</span>
                <a href={`mailto:${email}`} className={s.v}>
                  {email}
                </a>
                <button
                  type="button"
                  className={s.copy}
                  onClick={copy}
                  aria-label={t.copyEmail}
                >
                  {copied === "ok" ? "✓" : t.copy}
                </button>
              </li>
            )}
            {links.map((l, n) => (
              <li key={l.kind} className={`${s.row} rv`} style={{ ["--i" as string]: 3 + n }}>
                <span className={s.k}>{t[l.kind]}</span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className={s.v}>
                  {l.handle}
                  <span className="sr-only"> {t.opensNewTab}</span>
                </a>
                <span className={s.go} aria-hidden="true">
                  ↗
                </span>
              </li>
            ))}
          </ul>

          <p className={`${s.toast} ${copied !== "idle" ? s.toastOn : ""}`} role="status" aria-live="polite">
            {copied === "ok" ? t.copied : copied === "fail" ? t.copyFailed : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

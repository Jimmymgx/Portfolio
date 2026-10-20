"use client";

import { useEffect, useRef, useState } from "react";
import { MaskLines } from "@/components/ui/Reveal";
import { useReducedMotion } from "@/lib/hooks";
import { ui, type Locale } from "@/lib/i18n";
import { useScroll } from "@/lib/scroll";
import s from "./Hero.module.css";

interface Props {
  locale: Locale;
  /** Name lines for the h1, e.g. ["Mohamed", "Gamal"]. */
  nameLines: string[];
  ghost: string;
  title: string;
  roleLine: string | null;
  intro: string | null;
  introDraft: boolean;
  poster: string;
  video: { webm: string | null; mp4: string | null } | null;
  /** The CMS can switch the sound button off. */
  audioEnabled?: boolean;
  hasWork: boolean;
  resumeUrl: string | null;
  /** Button overrides from the CMS. Empty uses the default labels and targets. */
  primaryCta?: { text: string; href: string } | null;
  secondaryCta?: { text: string; href: string } | null;
}

export default function Hero({
  locale,
  nameLines,
  ghost,
  title,
  roleLine,
  intro,
  introDraft,
  poster,
  video,
  audioEnabled = true,
  hasWork,
  resumeUrl,
  primaryCta,
  secondaryCta,
}: Props) {
  const t = ui(locale);
  const { scrollTo } = useScroll();
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const vref = useRef<HTMLVideoElement>(null);
  const visible = useRef(true);
  const [audible, setAudible] = useState(false);
  const audibleRef = useRef(false);

  // Autoplay (muted) only when allowed; pause + silence when the hero is mostly out of view.
  useEffect(() => {
    const v = vref.current;
    const hero = heroRef.current;
    if (!v || !hero) return;

    const tryPlay = () => {
      if (reduce && !audibleRef.current) return;
      v.play().catch(() => {
        // Sound blocked or autoplay refused: fall back to muted playback.
        if (!v.muted) {
          v.muted = true;
          audibleRef.current = false;
          setAudible(false);
          v.play().catch(() => {});
        }
      });
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.intersectionRatio >= 0.35;
        if (visible.current) tryPlay();
        else v.pause();
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [reduce]);

  const toggleSound = async () => {
    const v = vref.current;
    if (!v) return;
    if (!audibleRef.current) {
      // Start the introduction from the top so the visitor hears it from the first word.
      v.currentTime = 0;
      v.muted = false;
      v.volume = 1;
      try {
        await v.play();
        audibleRef.current = true;
        setAudible(true);
      } catch {
        v.muted = true;
      }
    } else {
      v.muted = true;
      audibleRef.current = false;
      setAudible(false);
      if (reduce) v.pause();
    }
  };

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    scrollTo(`#${id}`);
    history.replaceState(null, "", `#${id}`);
  };

  const primary = primaryCta ?? (hasWork ? { text: t.exploreWork, href: "#work" } : null);
  const secondary = secondaryCta ?? { text: t.letsTalk, href: "#contact" };
  const cta = (c: { text: string; href: string }, className: string) =>
    c.href.startsWith("#") ? (
      <a href={c.href} className={className} onClick={(e) => go(e, c.href.slice(1))}>
        {c.text}
      </a>
    ) : (
      <a href={c.href} className={className} {...(/^https?:/.test(c.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {c.text}
      </a>
    );

  return (
    <section id="top" ref={heroRef} className={s.hero} aria-labelledby="hero-title">
      <div className={s.ghost} aria-hidden="true">
        {ghost}
      </div>

      <div className={s.stage}>
        <div className={s.left}>
          <p className={`eyebrow ${s.title} rv`}>{title}</p>
          <h1 id="hero-title" className={s.name}>
            <MaskLines lines={nameLines} accentLast start={1} />
          </h1>
        </div>

        <figure className={s.portrait}>
          {video ? (
            <video
              ref={vref}
              className={s.video}
              muted
              loop
              playsInline
              preload="metadata"
              poster={poster}
              aria-label={t.heroVideoLabel}
              disableRemotePlayback
            >
              {video.webm && <source src={video.webm} type="video/webm" />}
              {video.mp4 && <source src={video.mp4} type="video/mp4" />}
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.video} src={poster} alt={t.heroVideoLabel} />
          )}
          <figcaption className="sr-only">{t.avatarNote}</figcaption>
          {video && audioEnabled && (
            <button
              type="button"
              className={s.sound}
              onClick={toggleSound}
              aria-pressed={audible}
              aria-label={audible ? t.soundOff : t.soundOn}
            >
              {audible ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  <path d="m22 9-6 6" />
                  <path d="m16 9 6 6" />
                </svg>
              )}
            </button>
          )}
        </figure>

        <div className={s.right}>
          {roleLine && (
            <p className={`${s.role} rv`} style={{ ["--i" as string]: 2 }}>
              {roleLine}
            </p>
          )}
          {intro && (
            <p className={`${s.intro} rv`} style={{ ["--i" as string]: 3 }}>
              {intro}
              {introDraft && <span className="draft-tag">{t.draft}</span>}
            </p>
          )}
          <div className={`${s.cta} rv`} style={{ ["--i" as string]: 4 }}>
            {primary && cta(primary, "btn btn-primary")}
            {cta(secondary, "btn btn-ghost")}
            {resumeUrl && (
              <a href={resumeUrl} className="btn btn-ghost" download>
                {t.resume}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

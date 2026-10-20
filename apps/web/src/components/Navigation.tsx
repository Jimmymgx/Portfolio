"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useActiveSection } from "@/lib/hooks";
import { ui, type Locale } from "@/lib/i18n";
import { useScroll } from "@/lib/scroll";
import s from "./Navigation.module.css";

export interface NavLink {
  id: string;
  label: string;
  number: string;
}

interface Props {
  locale: Locale;
  links: NavLink[];
  name: string;
  initials: string;
  otherLocaleHref: string;
}

export default function Navigation({ locale, links, name, initials, otherLocaleHref }: Props) {
  const t = ui(locale);
  const { scrollTo, stop, start } = useScroll();
  const active = useActiveSection(links.map((l) => l.id));
  const [open, setOpen] = useState(false);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Sliding indicator follows the active link.
  const measure = useCallback(() => {
    const el = active ? linkRefs.current[active] : null;
    if (!el) return setInd(null);
    setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Mobile menu: scroll lock, Escape, focus management and focus trap.
  useEffect(() => {
    if (!open) return;
    stop();
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = [
        toggleRef.current,
        ...Array.from(overlayRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? []),
      ].filter(Boolean) as HTMLElement[];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const cur = document.activeElement;
      if (e.shiftKey && cur === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && cur === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      start();
      toggleRef.current?.focus({ preventScroll: true });
    };
  }, [open, start, stop]);

  // Close the menu if the viewport grows to desktop width.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const wasOpen = open;
    setOpen(false);
    // Let the scroll lock release before scrolling.
    window.setTimeout(() => scrollTo(`#${id}`), wasOpen ? 60 : 0);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      <div className={s.progress} aria-hidden="true" />
      <header className={s.header}>
        <div className={s.bar}>
          <a
            href="#top"
            className={s.brand}
            onClick={(e) => {
              e.preventDefault();
              scrollTo(0);
              history.replaceState(null, "", window.location.pathname);
            }}
          >
            <span className={s.mark} aria-hidden="true">
              {initials}
            </span>
            <span className={s.name}>{name}</span>
          </a>

          <nav className={s.desktop} aria-label={t.mainNav}>
            <ul className={s.pill} ref={listRef}>
              <li
                className={s.indicator}
                aria-hidden="true"
                style={{
                  transform: `translateX(${ind?.left ?? 0}px)`,
                  width: ind?.width ?? 0,
                  opacity: ind ? 1 : 0,
                }}
              />
              {links.map((l) => (
                <li key={l.id}>
                  <a
                    href={`#${l.id}`}
                    ref={(el) => {
                      linkRefs.current[l.id] = el;
                    }}
                    className={`${s.link} ${active === l.id ? s.linkActive : ""}`}
                    aria-current={active === l.id ? "true" : undefined}
                    onClick={(e) => go(e, l.id)}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={s.right}>
            <a
              href={otherLocaleHref}
              className={s.lang}
              hrefLang={locale === "en" ? "ar" : "en"}
              lang={locale === "en" ? "ar" : "en"}
              title={t.switchLangLabel}
            >
              {t.switchLang}
            </a>
            <button
              ref={toggleRef}
              type="button"
              className={s.menuBtn}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.closeMenu : t.openMenu}
              onClick={() => setOpen((v) => !v)}
            >
              <span>{open ? t.close : t.menu}</span>
              <span className={`${s.burger} ${open ? s.burgerOpen : ""}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        ref={overlayRef}
        className={`${s.overlay} ${open ? s.overlayOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.mainNav}
        inert={!open}
      >
        <ul className={s.overlayList}>
          {links.map((l, n) => (
            <li key={l.id} style={{ ["--i" as string]: n }}>
              <a
                href={`#${l.id}`}
                ref={n === 0 ? firstLinkRef : undefined}
                className={s.overlayLink}
                onClick={(e) => go(e, l.id)}
              >
                <span className={s.overlayNum}>{l.number}</span>
                <span>{l.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

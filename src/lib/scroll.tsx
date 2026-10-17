"use client";

import Lenis from "lenis";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

interface ScrollApi {
  /** Smooth-scrolls to a selector, element or Y offset. Falls back to native scroll for reduced motion. */
  scrollTo: (target: string | HTMLElement | number) => void;
  stop: () => void;
  start: () => void;
}

const Ctx = createContext<ScrollApi>({
  scrollTo: () => {},
  stop: () => {},
  start: () => {},
});

export const useScroll = () => useContext(Ctx);

export function ScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    if (!reduce) {
      const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: false });
      lenisRef.current = lenis;
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    // Page progress + "scrolled" flag written straight to the DOM (no React re-renders).
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      root.style.setProperty("--page-progress", String(Math.min(1, y / max)));
      if (y > 40) root.setAttribute("data-scrolled", "");
      else root.removeAttribute("data-scrolled");
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      lenisRef.current?.destroy();
      lenisRef.current = null;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const api = useMemo<ScrollApi>(
    () => ({
      scrollTo: (target) => {
        const lenis = lenisRef.current;
        if (lenis) {
          lenis.scrollTo(target as never, { duration: 1.2, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
          return;
        }
        if (typeof target === "number") {
          window.scrollTo({ top: target });
        } else {
          const el = typeof target === "string" ? document.querySelector(target) : target;
          el?.scrollIntoView();
        }
      },
      stop: () => lenisRef.current?.stop(),
      start: () => lenisRef.current?.start(),
    }),
    [],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

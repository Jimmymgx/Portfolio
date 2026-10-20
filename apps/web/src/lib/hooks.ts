"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const RM_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeRM(cb: () => void) {
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when the visitor asked for reduced motion. Server snapshot is false. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeRM,
    () => window.matchMedia(RM_QUERY).matches,
    () => false,
  );
}

/** Tracks which section is under the viewport's middle band. */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    // Clear when above the first section (hero).
    const top = () => {
      if (window.scrollY < 120) setActive(null);
    };
    window.addEventListener("scroll", top, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", top);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

/** Reports whether an element is intersecting. Re-renders only when the flag flips. */
export function useInView<T extends Element>(threshold = 0.2, once = false) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting && once) io.disconnect();
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return [ref, inView] as const;
}

/**
 * Calls `fn(progress)` (0..1) while the element crosses the viewport.
 * Uses a passive scroll listener + rAF. Writes should go straight to the DOM (no React state).
 */
export function useScrollProgress<T extends HTMLElement>(
  fn: (progress: number, el: T) => void,
  deps: unknown[] = [],
) {
  const ref = useRef<T | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const run = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height + vh * 0.5;
      const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / total));
      fnRef.current(p, el);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };
    run();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Stable callback that focuses an element and restores focus on cleanup. */
export function useFocusReturn() {
  const prev = useRef<HTMLElement | null>(null);
  const save = useCallback(() => {
    prev.current = document.activeElement as HTMLElement | null;
  }, []);
  const restore = useCallback(() => {
    prev.current?.focus?.();
    prev.current = null;
  }, []);
  return { save, restore };
}

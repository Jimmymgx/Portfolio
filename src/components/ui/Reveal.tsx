"use client";

import { useEffect, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Global RevealObserver. Adds `.is-in` once to every `.rv` / `.rv-mask` element that
 * scrolls into view. Picks up elements added later via a MutationObserver.
 */
export function RevealObserver() {
  useEffect(() => {
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    const scan = (root: ParentNode) => {
      root.querySelectorAll(".rv, .rv-mask, .rv-wave").forEach((el) => {
        if (!seen.has(el) && !el.classList.contains("is-in")) {
          seen.add(el);
          io.observe(el);
        }
      });
    };
    scan(document);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

export function Reveal({
  as: Tag = "div",
  i = 0,
  className = "",
  style,
  children,
}: {
  as?: ElementType;
  i?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Tag className={`rv ${className}`} style={{ ...style, ["--i" as string]: i }}>
      {children}
    </Tag>
  );
}

/** Masked, line-by-line text reveal. Pass one string per visual line. */
export function MaskLines({
  lines,
  accentLast = false,
  start = 0,
}: {
  lines: readonly string[];
  /** Applies the serif-italic accent to the final line (or word). */
  accentLast?: boolean;
  start?: number;
}) {
  return (
    <>
      {lines.map((line, n) => {
        const last = n === lines.length - 1;
        return (
          <span key={n} className="rv-mask">
            <span style={{ ["--i" as string]: start + n }} className={accentLast && last ? "accent" : undefined}>
              {line}
            </span>
          </span>
        );
      })}
    </>
  );
}

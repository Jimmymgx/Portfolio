/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

/**
 * Official technology logos (Devicon, MIT licence — see /public/logos/LICENSE-devicon.txt),
 * stored locally. `glow` is the brand tint used for a subtle shadow.
 */
export const BRAND: Record<string, { src: string; glow: string }> = {
  javascript: { src: "/logos/javascript.svg", glow: "#f0db4f" },
  typescript: { src: "/logos/typescript.svg", glow: "#3178c6" },
  react: { src: "/logos/react.svg", glow: "#61dafb" },
  nextjs: { src: "/logos/nextjs.svg", glow: "#000000" },
  nodejs: { src: "/logos/nodejs.svg", glow: "#5fa04e" },
  php: { src: "/logos/php.svg", glow: "#777bb3" },
  laravel: { src: "/logos/laravel.svg", glow: "#ff2d20" },
  python: { src: "/logos/python.svg", glow: "#3776ab" },
  mysql: { src: "/logos/mysql.svg", glow: "#4479a1" },
  postgresql: { src: "/logos/postgresql.svg", glow: "#336791" },
  mongodb: { src: "/logos/mongodb.svg", glow: "#47a248" },
  tailwindcss: { src: "/logos/tailwindcss.svg", glow: "#38bdf8" },
  html5: { src: "/logos/html5.svg", glow: "#e34f26" },
  css3: { src: "/logos/css3.svg", glow: "#1572b6" },
  flutter: { src: "/logos/flutter.svg", glow: "#02569b" },
  dart: { src: "/logos/dart.svg", glow: "#0175c2" },
  wordpress: { src: "/logos/wordpress.svg", glow: "#21759b" },
  git: { src: "/logos/git.svg", glow: "#f05032" },
  github: { src: "/logos/github.svg", glow: "#181717" },
  docker: { src: "/logos/docker.svg", glow: "#2496ed" },
  express: { src: "/logos/express.svg", glow: "#444444" },
  nestjs: { src: "/logos/nestjs.svg", glow: "#e0234e" },
  firebase: { src: "/logos/firebase.svg", glow: "#ffca28" },
  redis: { src: "/logos/redis.svg", glow: "#dc382d" },
  figma: { src: "/logos/figma.svg", glow: "#f24e1e" },
  vuejs: { src: "/logos/vuejs.svg", glow: "#42b883" },
  angularjs: { src: "/logos/angularjs.svg", glow: "#dd0031" },
  csharp: { src: "/logos/csharp.svg", glow: "#68217a" },
  dotnetcore: { src: "/logos/dotnetcore.svg", glow: "#512bd4" },
  java: { src: "/logos/java.svg", glow: "#e76f00" },
  kotlin: { src: "/logos/kotlin.svg", glow: "#7f52ff" },
  swift: { src: "/logos/swift.svg", glow: "#f05138" },
  sass: { src: "/logos/sass.svg", glow: "#cc6699" },
  bootstrap: { src: "/logos/bootstrap.svg", glow: "#7952b3" },
};

const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Custom line icons for non-brand skills (concepts, methods, soft skills). */
export const CONCEPT: Record<string, ReactNode> = {
  "project-management": (
    <g {...line}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16M15 4v16M5.5 9h1M11.5 9h1M17.5 9h1M11.5 13h1" />
    </g>
  ),
  agile: (
    <g {...line}>
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" />
      <path d="M4 20v-4.5h4.5M20 4v4.5h-4.5" />
    </g>
  ),
  api: (
    <g {...line}>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14" />
    </g>
  ),
  architecture: (
    <g {...line}>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </g>
  ),
  testing: (
    <g {...line}>
      <path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3" />
      <path d="M7.5 15h9" />
    </g>
  ),
  design: (
    <g {...line}>
      <path d="m4 20 4-1L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
      <path d="m14.5 6.5 3 3" />
    </g>
  ),
  automation: (
    <g {...line}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </g>
  ),
  database: (
    <g {...line}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </g>
  ),
  cloud: (
    <g {...line}>
      <path d="M7 18a4.5 4.5 0 0 1-.7-8.9A6 6 0 0 1 17.8 8 4.5 4.5 0 0 1 17.5 18H7Z" />
    </g>
  ),
  communication: (
    <g {...line}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
    </g>
  ),
};

export function isBrand(key?: string | null): boolean {
  return !!key && key in BRAND;
}

export function brandGlow(key?: string | null): string | null {
  return key && BRAND[key] ? BRAND[key].glow : null;
}

interface Props {
  logo?: string | null;
  /** Uploaded logo (from the media library). Used when no bundled logo key matches. */
  src?: string | null;
  symbol: string;
  size?: number;
  className?: string;
}

export default function TechLogo({ logo, src, symbol, size = 64, className }: Props) {
  if (isBrand(logo)) {
    return (
      <img
        src={BRAND[logo!].src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        className={className}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        className={className}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  if (logo && CONCEPT[logo]) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
        style={{ width: size, height: size }}
      >
        {CONCEPT[logo]}
      </svg>
    );
  }
  // Fallback monogram.
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        fontWeight: 700,
        fontSize: size * 0.42,
        letterSpacing: "-0.04em",
      }}
    >
      {symbol}
    </span>
  );
}

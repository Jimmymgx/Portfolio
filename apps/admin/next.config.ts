import type { NextConfig } from "next";

const config: NextConfig = {
  // Lets tests build into a separate folder so they never disturb a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Optional same-origin proxy to the API, so the session cookie also works when the dashboard is opened through a
  // temporary tunnel address. Leave API_PROXY_TARGET empty for normal development and production.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
    return target ? [{ source: "/api/v1/:path*", destination: `${target}/api/v1/:path*` }] : [];
  },
  // The dashboard must never be indexed.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default config;

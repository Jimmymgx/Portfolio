import type { CorsOptions } from "cors";
import { env } from "./env.js";

/** Origins allowed to call the API with credentials. Public reads are also allowed from the website origin. */
export const allowedOrigins: string[] = [...new Set([new URL(env.PUBLIC_WEB_URL).origin, new URL(env.ADMIN_WEB_URL).origin, ...env.EXTRA_ALLOWED_ORIGINS.map((o) => new URL(o).origin)])];

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    // Same-origin and server-to-server calls carry no Origin header.
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token", "Accept"],
  maxAge: 600,
};

export function isAllowedOrigin(origin: string | undefined): boolean {
  return !origin || allowedOrigins.includes(origin);
}

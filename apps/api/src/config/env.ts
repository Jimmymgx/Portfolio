import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

/** Load a .env file from the app folder or the repository root. Real environment variables always win. */
function loadDotEnv() {
  for (const candidate of [".env", "../../.env"]) {
    const file = path.resolve(process.cwd(), candidate);
    if (existsSync(file)) {
      try {
        process.loadEnvFile(file);
      } catch {
        /* a malformed .env is reported by validation below */
      }
      return;
    }
  }
}

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    /** Public base URL of this API. Used to build media URLs. */
    API_PUBLIC_URL: z.url().default("http://localhost:4000"),
    PUBLIC_WEB_URL: z.url().default("http://localhost:3000"),
    ADMIN_WEB_URL: z.url().default("http://localhost:3001"),
    /** More origins allowed to call the API, comma separated (for example a temporary tunnel address). */
    EXTRA_ALLOWED_ORIGINS: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(",").map((o) => o.trim()).filter(Boolean) : []))
      .pipe(z.array(z.url())),
    TRUST_PROXY: bool.default(false),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine((v) => /^(mysql|mariadb):\/\//.test(v), "DATABASE_URL must start with mysql://"),

    /** Signs CSRF and preview tokens. At least 32 random characters. */
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    SESSION_TTL_HOURS: z.coerce.number().min(1).max(24 * 30).default(12),
    COOKIE_DOMAIN: z.string().trim().optional(),
    /** Salt for hashing visitor IPs on contact messages. */
    IP_HASH_SALT: z.string().min(8).default("change-me-ip-salt"),

    MEDIA_STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    LOCAL_UPLOAD_DIRECTORY: z.string().default("./uploads"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().optional(),
    S3_FORCE_PATH_STYLE: bool.default(false),

    /** Shared secret for the website's revalidation endpoint. Empty disables cache invalidation calls. */
    REVALIDATE_SECRET: z.string().optional(),
    WEB_REVALIDATE_URL: z.url().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.MEDIA_STORAGE_PROVIDER === "s3") {
      for (const key of ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!v[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when MEDIA_STORAGE_PROVIDER=s3` });
      }
    }
    if (v.NODE_ENV === "production") {
      if (v.IP_HASH_SALT === "change-me-ip-salt") {
        ctx.addIssue({ code: "custom", path: ["IP_HASH_SALT"], message: "Set IP_HASH_SALT in production" });
      }
      if (/^https?:\/\/localhost/.test(v.API_PUBLIC_URL)) {
        ctx.addIssue({ code: "custom", path: ["API_PUBLIC_URL"], message: "API_PUBLIC_URL must be the public API address in production" });
      }
    }
  });

export type Env = z.infer<typeof schema>;

function parse(): Env {
  loadDotEnv();
  // A line such as `COOKIE_DOMAIN=` copied from .env.example means "not set", not an empty value.
  const source = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    // Never print values: they may be secrets.
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}\nSee .env.example.`);
  }
  return result.data;
}

export const env: Env = parse();
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

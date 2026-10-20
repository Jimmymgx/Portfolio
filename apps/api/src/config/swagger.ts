import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { env } from "./env.js";

extendZodWithOpenApi(z);

/** Every module registers its paths here, using the same Zod schemas that validate the real requests. */
export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "sessionCookie", {
  type: "apiKey",
  in: "cookie",
  name: "pf_session",
  description: "HttpOnly session cookie set by POST /auth/login. Browsers send it automatically.",
});
registry.registerComponent("securitySchemes", "csrfToken", {
  type: "apiKey",
  in: "header",
  name: "X-CSRF-Token",
  description: "Required on every POST, PUT, PATCH and DELETE. Copy `csrfToken` from the login or /auth/me response.",
});

export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), message: z.string(), data, meta: z.unknown().nullable() });

export const errorEnvelope = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.object({ code: z.string(), details: z.array(z.unknown()) }),
});

/** Standard error responses attached to documented operations. */
export const errorResponses = {
  400: { description: "Validation failed", content: { "application/json": { schema: errorEnvelope } } },
  401: { description: "Not signed in", content: { "application/json": { schema: errorEnvelope } } },
  403: { description: "Not allowed (role or CSRF)", content: { "application/json": { schema: errorEnvelope } } },
  404: { description: "Not found", content: { "application/json": { schema: errorEnvelope } } },
  409: { description: "Conflict (duplicate or still in use)", content: { "application/json": { schema: errorEnvelope } } },
  429: { description: "Rate limited", content: { "application/json": { schema: errorEnvelope } } },
} as const;

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Portfolio Platform API",
      version: "1.0.0",
      description:
        "REST API for the portfolio website and its CMS. Public endpoints return published content only. " +
        "Admin endpoints require a session cookie and, for writes, the X-CSRF-Token header.",
    },
    servers: [{ url: `${env.API_PUBLIC_URL}/api/v1`, description: "This server" }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Public" },
      { name: "Users" },
      { name: "Profile" },
      { name: "Hero" },
      { name: "About" },
      { name: "Skills" },
      { name: "Projects" },
      { name: "Experience" },
      { name: "Education" },
      { name: "Certifications" },
      { name: "Achievements" },
      { name: "Social links" },
      { name: "Contact" },
      { name: "Messages" },
      { name: "Media" },
      { name: "Navigation & sections" },
      { name: "SEO" },
      { name: "Settings" },
      { name: "Audit logs" },
    ],
  });
}

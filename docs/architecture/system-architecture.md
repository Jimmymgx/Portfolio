# System architecture

## Overview

```text
 Visitors ──▶ apps/web  (Next.js, :3000)  ──server-side fetch (tags)──▶ ┐
                    ▲                                                   │
                    │ POST /api/revalidate (secret)                     ▼
 Admins  ──▶ apps/admin (Next.js, :3001) ──cookie session + CSRF──▶ apps/api (Express, :4000) ──▶ MySQL (Prisma)
                                                                        │
                                                                        └──▶ Storage (local disk | S3-compatible)
```

| App or package | Responsibility |
| --- | --- |
| `apps/web` | The public portfolio. Same components, same animation. Reads published content from the public API and renders `/en` and `/ar`. |
| `apps/admin` | CMS dashboard. Talks only to the admin API with an HttpOnly session cookie. |
| `apps/api` | Express REST API under `/api/v1`: public read endpoints, admin CRUD, auth, media, audit log, Swagger at `/api/docs`. |
| `packages/types` | TypeScript contracts shared by all apps (API envelopes, public payloads). |
| `packages/validation` | Zod schemas for every request body, param and query. Reused by API, dashboard forms and OpenAPI generation. |
| `packages/api-client` | Typed fetchers. Public client for the website, authenticated client for the dashboard. |
| `packages/config` | Shared non-secret configuration. |

## Technology

Node.js 22, Express 5, TypeScript, Zod 4, Prisma 7 with the MariaDB driver adapter (MySQL, no native query engine),
argon2id via `hash-wasm`, helmet, express-rate-limit, pino, multer + file-type + image-size,
Swagger UI + `@asteasolutions/zod-to-openapi`. Frontends: Next.js 15, React 19, Tailwind CSS 4.
Dashboard adds shadcn/ui, TanStack Query, React Hook Form and dnd-kit.

## Backend layering

Every module is a slice of one feature with the same roles.

| Role | Rule |
| --- | --- |
| Routes | Declare paths, attach `authenticate`, `authorize(role)`, `validate(schema)` and rate limits. |
| Controller | Reads validated input, calls the service, returns the standard envelope. No business logic. |
| Service | Business rules, publishing, transactions, audit entries, entity authorization. |
| Repository | The only layer that calls Prisma. Pagination, filtering, ordering. |
| Mapper | Turns database rows into stable public or admin DTOs. Public mappers whitelist fields. |
| Validation | Re-exports shared Zod schemas and adds query schemas. |

The ordered, publishable collections (skills, projects, experience, education, certifications, achievements,
social links, about facts, categories) share generic classes in `apps/api/src/common/crud`
(`CollectionRepository`, `CollectionService`, `CollectionController`, `collectionRouter`). A module file such as
`modules/career/career.module.ts` composes them with its own mapper, schemas and extra operations, so behaviour is
identical across modules and there is no copy-pasted CRUD code. Singletons (profile, hero, about, contact, site, SEO)
share `SingletonService` and `singletonRouter`, which implement draft, publish and discard. Modules with their own
logic (auth, media, messages, users, public, audit logs, navigation and sections) keep dedicated service and route
files. This is a deliberate deviation from "seven files per module": the layers are the same, they are just not
duplicated 20 times.

## API contract

- Base path `/api/v1`. Public: `/public/*`. Auth: `/auth/*`. Admin: `/admin/*`. Docs: `/api/docs`.
- Success: `{ success: true, message, data, meta }`. Error: `{ success: false, message, error: { code, details } }`.
- Lists accept `page`, `pageSize`, `sort`, `order`, `q` and entity filters; `meta` carries pagination.
- Status codes: 200, 201, 204, 400 (validation), 401, 403, 404, 409 (conflict, for example media still in use), 413, 429, 500.

## Authentication and authorization

- Login verifies argon2id, creates an `AdminSession` row, and sets two cookies: an HttpOnly `session` cookie holding a random token (only its SHA-256 is stored) and a readable `csrf` cookie.
- Every state-changing admin request must send the `csrf` value in `X-CSRF-Token` and must come from an allowed `Origin`.
- Sessions expire, can be revoked, and are revoked on logout and password change. Login is rate limited.
- Roles are enforced in middleware on the server: SUPER_ADMIN (everything, users, settings, audit logs), EDITOR (content and media), VIEWER (read-only).
- No default credentials. The first administrator is created by `pnpm --filter @portfolio/api admin:create`, which prompts for the password.

## Draft and publish

| Content | Mechanism |
| --- | --- |
| Collections | `status`: DRAFT, PUBLISHED, UNPUBLISHED. Public API returns PUBLISHED only. Unpublish hides without deleting. |
| Singletons | Two rows per entity (`state` DRAFT and PUBLISHED). Editing writes DRAFT. Publish copies DRAFT to PUBLISHED in one transaction. |
| Preview | An authenticated admin session, or a short-lived HMAC token scoped to one path and one locale, lets the website render DRAFT data. Previews are never cached. |

## Public website integration

1. `packages/api-client` exposes `getPortfolio(locale)`, wrapping `GET /public/*` calls with Next `fetch` tags (`portfolio`, `projects`, `skills`, ...).
2. An adapter in `apps/web/src/lib` converts the payload into the shapes the components already use, so the components do not change.
3. Sections render from a controlled registry (`hero`, `about`, `skills`, `work`, `certifications`, `experience`, `achievements`, `contact`) ordered by `SectionSetting`. The database never selects arbitrary components. Disabled sections drop out of the page, the navigation and the numbering.
4. After a publish, the API calls `POST {WEB_URL}/api/revalidate` with a shared secret and the affected tags. Pages refresh without a rebuild.
5. Metadata, `sitemap.xml` and `robots.txt` come from published SEO and site settings.
6. If the API is unreachable at build time the web app falls back to the static content in `src/lib/data.ts`.

## Media

`StorageProvider` interface with `local` (development, served by the API under `/media/*`) and `s3` (any S3-compatible service)
drivers. Uploads are validated by extension, real content type (magic bytes), size and, for images, dimensions.
File names are replaced by random storage keys. SVG is accepted only after sanitising, otherwise rejected.
Media referenced by content cannot be deleted (HTTP 409).

## Security checklist

helmet headers, CORS allow-list with credentials, CSRF defence, request size limits, rate limits on login and contact,
Zod validation everywhere, Prisma parameterised queries (no raw SQL), argon2id, hashed session tokens, upload validation,
audit log without secrets, structured logs without secrets, environment validation at start-up, safe production errors
(no stack traces).

## How the website uses the API

`apps/web/src/lib/site-model.ts` builds one `SiteModel` per language, either from the API (`fromApi`) or from the bundled
`data.ts` (`fromStatic`, used when the API is unreachable or has no published profile). Every section component receives
plain, already-resolved props from that model, so the components, CSS and animations are unchanged. The page renders the
sections from a fixed registry in the order the database gives.

Details that matter:

- `packages/api-client` looks up `fetch` at call time. Next.js replaces the global `fetch` with a caching version; capturing the original at import time silently disabled cache tags (found and fixed during testing).
- The page is statically generated, tagged `portfolio`, and revalidates every 300 seconds as a safety net. `POST /api/revalidate` (shared secret) drops the tag after a publish.
- `dynamicParams` stays enabled: with it off, Next failed to regenerate the pages after a tag refresh. Unknown languages are rejected with `notFound()` in the layout and page.
- Draft preview uses Next draft mode plus a short-lived token kept in an HttpOnly cookie; previews are never cached and are `noindex`.
- Metadata, sitemap and robots come from published SEO and site settings; maintenance mode swaps the page for a short notice.

## Build and run

`pnpm dev` starts web, admin and api together. `pnpm dev:web`, `dev:admin`, `dev:api` start one each.
`pnpm build` builds the packages and apps. Ports are configurable through environment variables.

## Decisions recorded

| Decision | Reason |
| --- | --- |
| Paired English/Arabic columns | Matches the existing `{ en, ar }` content, simple queries, easy English fallback. |
| Two-row singletons for drafts | Fully relational, one consistent publish operation, no JSON blobs. |
| Prisma 7 + MariaDB adapter | No native engine binary; this Windows machine already blocks native binaries. |
| argon2id through WASM | Same reason; avoids native addons. |
| Plain text for long copy | Existing components render strings; rich HTML would force component rewrites. |
| Generic CRUD base classes | Avoids repeating the same code in 15 modules. |

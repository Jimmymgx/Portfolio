# Portfolio platform

A bilingual (English and Arabic) personal portfolio with its own content management system.

| App | What it is | Port |
| --- | --- | --- |
| `apps/web` | The public website (Next.js 15). Design and animation unchanged. | 3000 |
| `apps/admin` | The CMS dashboard (Next.js 15, Tailwind 4, shadcn-style components, TanStack Query). | 3001 |
| `apps/api` | REST API (Express 5, TypeScript, Prisma 7, MySQL) with Swagger at `/api/docs`. | 4000 |
| `packages/*` | Shared Zod schemas (`validation`), TypeScript contracts (`types`), typed clients (`api-client`), config. | |

Everything the owner edits in the dashboard is published through the API to the website without a rebuild. If the API is unreachable, the website falls back to the bundled content in `apps/web/src/lib/data.ts`, so it never breaks.

## Quick start

```bash
corepack enable                       # once
pnpm install
cp .env.example .env                  # fill in DATABASE_URL and SESSION_SECRET
cp apps/web/.env.example   apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local

# database: follow docs/deployment/database-setup.md (nothing is applied automatically)
pnpm db:migrate
pnpm admin:create -- --email you@example.com --name "Your Name"
pnpm content:import -- --dry-run      # optional: load the current website content

pnpm dev                              # website :3000, dashboard :3001, API :4000
```

The website alone works without a database: `pnpm dev:web`.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` / `dev:web` / `dev:admin` / `dev:api` | Run everything or one app |
| `pnpm build` | Build packages, API, website and dashboard |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm test` | API tests (in-memory fake database) |
| `pnpm db:validate` / `pnpm db:migrate` | Validate the schema / apply migrations (`prisma migrate deploy`) |
| `pnpm admin:create` | Create an administrator (hidden password prompt) |
| `pnpm content:import` | One-time, idempotent import of the static content (`-- --dry-run` first) |

## Documentation

| | |
| --- | --- |
| Architecture | [audit of the original site](docs/architecture/existing-project-audit.md), [system architecture](docs/architecture/system-architecture.md), [database design](docs/architecture/database-design.md), [folder structure](docs/architecture/folder-structure.md) |
| API | [API guide](docs/api/api-guide.md) and the live reference at `/api/docs` |
| CMS | [user guide](docs/cms/cms-user-guide.md), [publishing workflow](docs/cms/publishing-workflow.md) |
| Deployment | [local development](docs/deployment/local-development.md), [environment variables](docs/deployment/environment-variables.md), [database setup](docs/deployment/database-setup.md), [production deployment](docs/deployment/production-deployment.md) |
| Content decisions | [discovery log](content/discovery.md), [open questions](content/pending-questions.md) |

## Content rules (unchanged from the original brief)

- Only the owner's own, approved information is published. Nothing comes from a résumé; nothing is invented.
- Text awaiting approval stays a draft until the owner publishes it.
- The avatar is labelled "Illustrated avatar" and project visuals without screenshots are labelled "Illustrative UI".
- Credentials, engineer names and internal notes from the owner's project sheet are never stored anywhere in this repository.

## Layout

```text
apps/web      public site          apps/admin   dashboard          apps/api   API + Prisma schema
packages/     validation, types, api-client, config
scripts/      build-hero-assets.py (hero video pipeline) and source-media/
docs/         architecture, api, cms, deployment
content/      discovery.md, pending-questions.md
```

## Verification status

See the report at the end of the milestone summary in the project conversation, and `docs/architecture/system-architecture.md` for what each automated check covers.

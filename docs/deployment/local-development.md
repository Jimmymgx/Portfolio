# Local development

## Requirements

- Node.js 20.12 or newer (22 recommended)
- pnpm 10 (`corepack enable` once, or `corepack pnpm …`)
- MySQL or MariaDB (XAMPP works) — only needed for the API and dashboard
- Python 3 with `imageio-ffmpeg numpy pillow` — only to rebuild the hero video

## First run

```bash
corepack enable              # once; makes the `pnpm` command available
pnpm install
cp .env.example .env         # then fill in DATABASE_URL and SESSION_SECRET
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

Set up the database as described in [database-setup.md](database-setup.md) (create database, `pnpm db:migrate`, `pnpm admin:create`, optionally `pnpm content:import`).

## Run

| Command | Starts | Port |
| --- | --- | --- |
| `pnpm dev` | everything below (builds the shared packages first) | |
| `pnpm dev:web` | public website | 3000 |
| `pnpm dev:admin` | CMS dashboard | 3001 |
| `pnpm dev:api` | API (and Swagger at `/api/docs`) | 4000 |

The website works with no API at all: it falls back to the bundled content in `apps/web/src/lib/data.ts`. That is why `pnpm dev:web` alone shows the full site.

Sign in to the dashboard at http://localhost:3001 with the account you created. Open http://localhost:4000/api/docs for the interactive API reference.

## Check and build

```bash
pnpm typecheck               # all packages and apps
pnpm test                    # API tests (they use an in-memory fake database)
pnpm build                   # production build of every package and app
```

## Things worth knowing

- The shared packages (`packages/validation`, `types`, `api-client`) compile to `dist/`. After changing one, run `pnpm build:packages`; `pnpm dev` does this for you at start.
- Do not run `next build` in an app while `next dev` is running in the same app: both use the `.next` folder. Use `NEXT_DIST_DIR=.next-test pnpm --filter @portfolio/web build` instead.
- The website refreshes after a CMS publish only if `REVALIDATE_SECRET` is the same in the API and the website.
- Windows may block Next.js's native compiler (Application Control). Next then falls back to its WebAssembly compiler: slower but fine.
- Review modes for the static fallback: `NEXT_PUBLIC_SHOW_DRAFTS=1` shows unapproved drafts; `NEXT_PUBLIC_SAMPLE_CONTENT=1` shows clearly fake sample records for layout testing.

## Rebuilding the hero video

```bash
pip install imageio-ffmpeg numpy pillow
python scripts/build-hero-assets.py --video scripts/source-media/<intro>.mp4 --image scripts/source-media/<portrait>.jpg
```

Then upload the new files in the dashboard under Hero. The script writes to `apps/web/public`, which is the static fallback copy.

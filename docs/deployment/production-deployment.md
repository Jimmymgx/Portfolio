# Production deployment

The platform is three Node services and a database. Any host that runs Node 20+ works (a VPS, Docker, Railway, Render, Fly, or a mix such as Vercel for the website and dashboard and a VPS for the API).

```text
visitors ─▶ website   (apps/web,   Next.js)  ─▶ API ─▶ MySQL
admins   ─▶ dashboard (apps/admin, Next.js)  ─▶ API ─▶ file storage (disk or S3)
```

## Before you start: decisions still open

These were left as sensible defaults and are tracked in `content/pending-questions.md`:

| Decision | Default now | Needed for |
| --- | --- | --- |
| Domain names | none | CORS, cookies, canonical URLs, sitemap |
| Hosting for website / dashboard / API / MySQL | none | everything below |
| Production media storage | local disk | S3-compatible storage is recommended for any host without persistent disk |
| Email notifications for the contact form | off (messages are stored only) | optional later work |
| Dashboard on a sub-domain | separate app on its own origin | cookie scope |

## Recommended layout

| Service | Example address | Notes |
| --- | --- | --- |
| Website | `https://example.com` | static pages, refreshed by the API |
| Dashboard | `https://admin.example.com` | not indexed; sign-in only |
| API | `https://api.example.com` | behind HTTPS |
| MySQL | private network | utf8mb4 |

Keep the dashboard and the API on the **same site** (`admin.example.com` and `api.example.com`): the session cookie is `SameSite=Lax`, which is sent between sibling sub-domains but not between unrelated domains. Set `COOKIE_DOMAIN=.example.com`.

## Steps

### 1. Database

Follow [database-setup.md](database-setup.md): create the database and user, `pnpm db:migrate`, `pnpm admin:create`, optionally `pnpm content:import`.

### 2. API

```bash
pnpm install --frozen-lockfile
pnpm build:packages
pnpm --filter @portfolio/api build        # generates the Prisma client, compiles to apps/api/dist
node apps/api/dist/server.js              # with the environment below
```

Environment (see [environment-variables.md](environment-variables.md)):

```env
NODE_ENV=production
API_PORT=4000
API_PUBLIC_URL=https://api.example.com
PUBLIC_WEB_URL=https://example.com
ADMIN_WEB_URL=https://admin.example.com
TRUST_PROXY=true
DATABASE_URL=mysql://portfolio:…@db-host:3306/portfolio?ssl=true
SESSION_SECRET=<48 random characters>
IP_HASH_SALT=<random>
COOKIE_DOMAIN=.example.com
REVALIDATE_SECRET=<random, same as the website>
MEDIA_STORAGE_PROVIDER=s3
S3_BUCKET=… S3_REGION=… S3_ACCESS_KEY_ID=… S3_SECRET_ACCESS_KEY=… S3_ENDPOINT=… S3_PUBLIC_BASE_URL=https://cdn.example.com
```

Run it under a process manager (systemd, PM2, Docker restart policy). Put HTTPS and a reverse proxy in front. The health check is `GET /api/v1/health` (returns `database: "up"` when MySQL is reachable). If you use local file storage, mount a persistent volume at `apps/api/uploads`.

### 3. Website

```env
API_INTERNAL_URL=https://api.example.com/api/v1      # or an internal address
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
REVALIDATE_SECRET=<same as the API>
```

```bash
pnpm --filter @portfolio/web build
pnpm --filter @portfolio/web start        # next start -p 3000
```

The build reads content from the API, so start the API first (or the build uses the bundled static content, and the pages fix themselves within five minutes once the API is reachable). `NEXT_PUBLIC_API_URL` is baked in at build time.

### 4. Dashboard

```env
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
NEXT_PUBLIC_WEB_URL=https://example.com
```

```bash
pnpm --filter @portfolio/admin build
pnpm --filter @portfolio/admin start      # next start -p 3001
```

### 5. First sign-in and launch checklist

- [ ] Sign in at the dashboard; change nothing yet.
- [ ] **Settings → Site**: set the public website address, publish.
- [ ] **SEO**: title and description, publish. Check `https://example.com/sitemap.xml` and `/robots.txt`.
- [ ] Review every page's drafts, publish what is approved.
- [ ] Turn on the contact form if wanted; send a test message.
- [ ] Rotate any password that was ever shared (including those in your old project sheet).
- [ ] Create the other administrator accounts; make sure at least two super administrators exist.
- [ ] Confirm `GET /api/docs` asks for sign-in.
- [ ] Back up the database and media (see database-setup.md) and test a restore.

## Security checklist

- HTTPS everywhere; `Secure` cookies are on automatically when `NODE_ENV=production`.
- `ADMIN_WEB_URL` and `PUBLIC_WEB_URL` are the only origins the API accepts credentials from.
- Secrets live only in the host's environment, never in git.
- The database user can only reach its own database; use TLS for remote connections.
- Uploads are validated by content, size-limited and stored under random names; SVG is sandboxed.
- Login, contact and upload endpoints are rate limited (per IP; set `TRUST_PROXY=true` behind a proxy).
- The audit log records changes; review it after handing access to others.
- Keep dependencies updated (`pnpm update --latest` in a branch, then `pnpm test` and `pnpm build`).

## Updating the site later

Content changes never need a deployment: edit and publish in the dashboard. Code changes: `git pull`, `pnpm install --frozen-lockfile`, `pnpm build`, restart the services. New database migrations (committed under `apps/api/prisma/migrations`) are applied with `pnpm db:migrate` after a backup.

## Rolling back

Code: redeploy the previous commit. Data: restore the database backup (and media if files were deleted). Migrations are forward-only; restore the backup taken before the migration.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Dashboard login works but every request returns 401 | The cookie is not sent: dashboard and API are on unrelated domains, `COOKIE_DOMAIN` is wrong, or the site is on HTTP while `NODE_ENV=production` (Secure cookie). |
| Writes return `CSRF_FAILED` | `ADMIN_WEB_URL` does not match the dashboard's real origin (scheme, host and port must match exactly). |
| Website shows old content after publishing | `REVALIDATE_SECRET` differs between API and website, `PUBLIC_WEB_URL` is wrong, or the API cannot reach the website. Check the API log for "Website revalidation failed". |
| Images and video do not load on the website | `API_PUBLIC_URL` is not the public API address, or the proxy blocks `/media`. |
| Hero video plays silently | Browsers block sound until a visitor presses the sound button; this is by design. |

# Environment variables

Real values never go in git. `.env.example` (repository root) documents the API; `apps/web/.env.example` and `apps/admin/.env.example` document the two Next.js apps.

The API reads `.env` from `apps/api/` or the repository root. Next.js reads `.env.local` from each app's own folder (`apps/web`, `apps/admin`) or the hosting dashboard. The API validates its variables at start-up and refuses to run with a clear list of what is wrong (values are never printed).

## API (`apps/api`)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `production` turns on secure cookies, hides the docs from visitors, and requires `IP_HASH_SALT` and a real `API_PUBLIC_URL`. |
| `API_PORT` | no | `4000` | Port to listen on. |
| `API_PUBLIC_URL` | prod | `http://localhost:4000` | Public address of the API. Used to build media URLs. |
| `PUBLIC_WEB_URL` | no | `http://localhost:3000` | Website origin. Allowed by CORS; used for preview links and revalidation. |
| `ADMIN_WEB_URL` | no | `http://localhost:3001` | Dashboard origin. Allowed by CORS with credentials; the only origin allowed to send cookie-authenticated writes. |
| `TRUST_PROXY` | no | `false` | Set `true` behind a reverse proxy so real client IPs are used for rate limits. |
| `DATABASE_URL` | **yes** | | `mysql://user:password@host:3306/database`. Add `?ssl=true` for TLS. |
| `SESSION_SECRET` | **yes** | | At least 32 random characters. Signs CSRF and preview tokens. Changing it signs everyone out of CSRF checks and invalidates preview links. |
| `SESSION_TTL_HOURS` | no | `12` | Length of an administrator session. |
| `COOKIE_DOMAIN` | no | | Set to `.example.com` when the dashboard and API are on sibling subdomains. Leave empty for localhost. |
| `IP_HASH_SALT` | prod | | Salt for the one-way hash stored with contact messages. |
| `MEDIA_STORAGE_PROVIDER` | no | `local` | `local` or `s3`. |
| `LOCAL_UPLOAD_DIRECTORY` | no | `./uploads` | Where local files are stored (relative to `apps/api`). Needs persistent disk in production. |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | with `s3` | | Credentials for any S3-compatible service. |
| `S3_ENDPOINT` | no | | For R2, MinIO and other non-AWS services. |
| `S3_PUBLIC_BASE_URL` | no | endpoint + bucket | Public address files are served from (a CDN, for example). |
| `S3_FORCE_PATH_STYLE` | no | `false` | `true` for MinIO and some other providers. |
| `REVALIDATE_SECRET` | recommended | | Shared with the website. Without it the API cannot ask the website to refresh, so changes appear only after the five-minute safety window. |
| `WEB_REVALIDATE_URL` | no | `PUBLIC_WEB_URL/api/revalidate` | Use an internal address if the API reaches the website privately. |
| `LOG_LEVEL` | no | `info` | `fatal` … `trace`, or `silent`. |

## Website (`apps/web`)

| Variable | Purpose |
| --- | --- |
| `API_INTERNAL_URL` | Where the website's server reads content (for example `http://api:4000/api/v1`). Falls back to `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_API_URL` | API address for the visitor's browser (contact form). Baked in at build time. |
| `REVALIDATE_SECRET` | Must equal the API's value. |
| `NEXT_PUBLIC_SITE_URL` | Optional fallback for the public address; the CMS Site settings value wins. |
| `CONTENT_SOURCE=static` | Optional: ignore the API and use the bundled content. |
| `NEXT_PUBLIC_SHOW_DRAFTS`, `NEXT_PUBLIC_SAMPLE_CONTENT` | Development review modes. Never set in production. |
| `NEXT_DIST_DIR` | Build output folder (default `.next`). Tests use a separate folder so they never disturb a running `next dev`. |

## Dashboard (`apps/admin`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API address for the administrator's browser. Baked in at build time. |
| `NEXT_PUBLIC_WEB_URL` | Target of the "View site" button. |

## Generating secrets

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Use a different value for each secret, and different values per environment.

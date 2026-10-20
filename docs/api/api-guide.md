# API guide

Interactive reference (Swagger / OpenAPI 3.1): **`/api/docs`** (raw JSON at `/api/docs.json`). It is generated from the same Zod schemas that validate real requests, so it cannot drift from the code. In production it is visible only to signed-in administrators.

Base path: `/api/v1`. Content type: JSON. Dates are ISO strings; calendar dates (`startDate`, `issueDate`) are `YYYY-MM-DD`.

## Responses

```json
{ "success": true,  "message": "Operation completed successfully", "data": {}, "meta": null }
{ "success": false, "message": "Validation failed", "error": { "code": "VALIDATION_ERROR", "details": [ { "location": "body", "path": "name", "message": "This field is required" } ] } }
```

Lists return `data: []` and `meta: { page, pageSize, total, totalPages }`.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `UPLOAD_ERROR` | Bad input or an unacceptable file |
| 401 | `UNAUTHORIZED` | Not signed in or session expired |
| 403 | `FORBIDDEN`, `CSRF_FAILED` | Role too low, or missing/wrong CSRF token or origin |
| 404 | `NOT_FOUND` | Unknown record or route |
| 409 | `CONFLICT` | Duplicate value, or still referenced (media in use, category with skills) |
| 413 | | Body or file too large |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR`, `DATABASE_ERROR` | Safe message only; the real error is in the server log |

## Authentication

1. `POST /auth/login` with `{ email, password }` sets an HttpOnly `pf_session` cookie and returns `{ user, csrfToken }`.
2. Send the cookie on every admin request (browsers do it; use `credentials: "include"` in `fetch`).
3. Send `X-CSRF-Token: <csrfToken>` on every `POST`, `PUT`, `PATCH` and `DELETE`. Get a fresh one from `GET /auth/me` after a page reload.
4. `POST /auth/logout` revokes the session. `POST /auth/change-password` signs out all other sessions.

Sessions last 12 hours by default. Login is limited to 10 attempts per 15 minutes per IP and email. The same message is returned for a wrong password and an unknown account.

## Roles

| Role | Can do |
| --- | --- |
| `VIEWER` | Read everything in the CMS |
| `EDITOR` | Everything a viewer can, plus create, edit, publish and delete content and media |
| `SUPER_ADMIN` | Everything, plus users, the audit log and deleting contact messages |

Roles are enforced by the API on every route. The last active super administrator cannot be demoted, disabled or deleted, and nobody can change their own role or delete themselves.

## Public endpoints (no sign-in)

All accept `?lang=en|ar`. Arabic text falls back to English where Arabic is empty. They return **published** content only.

| Endpoint | Returns |
| --- | --- |
| `GET /public/portfolio` | Everything the home page needs in one response |
| `GET /public/site`, `profile`, `hero`, `about`, `skills`, `projects`, `experience`, `education`, `certifications`, `achievements`, `social-links`, `navigation`, `sections`, `contact`, `seo` | One block each |
| `GET /public/projects/:slug` | One project |
| `POST /public/contact/messages` | Contact form (only when enabled; 5 per hour per visitor; `website` is a honeypot) |
| `POST /public/preview/verify` | Checks a preview token |

Send `X-Preview-Token: <token>` to also see drafts. Such responses are never cached.

## Admin endpoints (`/admin/...`)

Collections share one shape: `GET /` (list: `page`, `pageSize`, `q`, `sort`, `order`, plus filters such as `status`, `categoryId`), `POST /`, `GET /:id`, `PATCH /:id` (partial), `DELETE /:id`, `POST /reorder` with `{ ids }`, and where publishable `POST /:id/publish` and `/:id/unpublish`.

| Path | Notes |
| --- | --- |
| `skills`, `skill-categories` | `projectIds` on a skill links it to projects |
| `projects` | plus `POST /:id/duplicate`, `PUT /:id/skills`; `skillIds` on a project; `featured` |
| `project-categories`, `project-features`, `project-media` | features and gallery images carry a `projectId`; `isCover` is exclusive per project |
| `experience`, `education`, `certifications`, `achievements`, `social-links`, `about-facts` | publishable |
| `navigation` | menu labels (not publishable) |
| `media` | `POST` multipart (`file` field); `PUT /:id/file` replaces; `GET /:id/usage`; `?unused=true` |
| `messages` | `PATCH /:id` `{ status }`; delete is super admin only |
| `users`, `audit-logs` | super admin only |

Singletons (`profile`, `hero`, `about`, `contact`, `settings`, `seo/:pageKey`): `GET /` returns `{ draft, published, hasUnpublishedChanges }`; `PATCH /` saves the draft; `POST /publish`; `POST /discard-draft`.

Others: `GET /admin/sections`, `PATCH /admin/sections/:key`, `POST /admin/sections/reorder`; `GET /admin/dashboard`; `POST /admin/preview-token`; `POST /admin/revalidate`.

## Uploads

`multipart/form-data` with a single `file` field. The type is detected from the file's bytes, never from its name or declared type.

| Kind | Types | Limit |
| --- | --- | --- |
| Image | JPEG, PNG, WebP, AVIF, GIF, SVG | 8 MB (SVG 1 MB) |
| Video | MP4, WebM | 80 MB |
| Document | PDF | 15 MB |

SVG is accepted only if it contains no scripts, event handlers, external links, `foreignObject`, entities or `url()` references; otherwise it is rejected. Identical bytes are stored once. Files get random storage keys. A file that content references cannot be deleted (409 with the list of uses). Local files are served at `/media/...` with year-long caching and, for SVG, a sandboxing CSP.

## Example

```bash
# sign in (keep cookies in a jar), then read the CSRF token from the response
curl -c jar -H 'Content-Type: application/json' -d '{"email":"you@example.com","password":"…"}' http://localhost:4000/api/v1/auth/login

# create and publish a project
curl -b jar -H 'X-CSRF-Token: <token>' -H 'Content-Type: application/json' \
  -d '{"title":"My project","categoryId":1}' http://localhost:4000/api/v1/admin/projects
curl -b jar -X POST -H 'X-CSRF-Token: <token>' http://localhost:4000/api/v1/admin/projects/1/publish
```

## Caching and the website

Public responses are cacheable for 30 seconds by a CDN. After every publish the API calls the website's `POST /api/revalidate` (secret-protected) so its pages refresh immediately.

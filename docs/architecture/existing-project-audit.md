# Existing project audit

Audit of the public portfolio as it stood at the baseline commit (`8478396`), before the
backend and CMS work. Nothing here is a design for the new system; see
`system-architecture.md` for that.

## 1. Current architecture

| Area | State |
| --- | --- |
| Framework | Next.js 15.5 App Router, React 19, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/postcss`) |
| Routing | `src/app/[locale]/` with `generateStaticParams` for `en` and `ar`; `/` redirects to `/en` (`next.config.ts`) |
| Rendering | Fully static (SSG) for both locales; no runtime data fetching |
| Content | Static TypeScript objects in `src/lib/data.ts`, gated by `src/lib/content.ts` |
| i18n | UI strings in `src/lib/i18n.ts`; content strings carry `{ en, ar?, status }` (`Copy`) |
| Motion | CSS, IntersectionObserver, rAF; Lenis smooth scroll (`src/lib/scroll.tsx`); reveal system in `src/components/ui/Reveal.tsx` and `globals.css` |
| Styling | Global tokens and shared classes in `globals.css`; CSS Modules for every unique interactive component |
| Fonts | Self-hosted woff2 via `next/font/local` in `[locale]/layout.tsx` |
| Media | `public/hero` (mp4, webm, poster), `public/portrait-bust.webp`, `public/og.jpg`, `public/logos/*.svg` (Devicon, MIT) |
| Tooling | npm, `package-lock.json`; Python script `scripts/build-hero-assets.py` (FFmpeg through `imageio-ffmpeg`) |
| SEO | `generateMetadata` in the locale layout, `robots.ts`, `sitemap.ts`, favicon/icon, `og.jpg` |
| Environment | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SHOW_DRAFTS`, `NEXT_PUBLIC_SAMPLE_CONTENT` only |
| Git | Initialised, one baseline commit (102 files) |
| Quality (measured) | Lighthouse mobile 95/100/100/100, desktop 100 across the board; 125 kB first-load JS; no overflow 360–2560 px |

## 2. Existing folder structure

```text
E:\Portfolio
├── content/                 discovery.md, pending-questions.md
├── public/                  hero/, logos/ (+ portrait-bust.webp, og.jpg created by the script)
├── scripts/                 build-hero-assets.py
├── src/
│   ├── app/                 [locale]/{layout,page}.tsx, globals.css, robots.ts, sitemap.ts, icon.png, favicon.ico
│   ├── components/          App, Navigation, hero/, sections/, ui/
│   ├── fonts/               7 woff2 + LICENSES.txt
│   └── lib/                 data.ts, content.ts, i18n.ts, hooks.ts, scroll.tsx, sample-data.ts
├── next.config.ts, postcss.config.mjs, tsconfig.json, package.json
├── Character_speaking_to_camera_*.mp4, Gemini_Generated_Image_*.jpg   (owner source media)
└── README.md
```

50 files under `src/`, about 1,060 lines in `src/lib`.

## 3. Components requiring API integration

Most components already receive resolved props, so the integration surface is small.

| File | How it touches content today | Change needed |
| --- | --- | --- |
| `src/app/[locale]/page.tsx` | Calls `getContent()`, `getNav()`, reads `PROFILE`, `PROJECT_KINDS`; builds `ProjectView[]`, `SkillView[]` | Replace with one awaited `getPortfolio()` (adapter over the public API). Section list becomes registry-driven and ordered. |
| `src/app/[locale]/layout.tsx` | `generateMetadata` reads `SITE_SETTINGS`, `PROFILE` | Read SEO and site settings from the API. |
| `src/components/sections/About.tsx` | Imports `PROFILE` directly | Take a `profile` prop from the page. |
| `src/components/sections/Experience.tsx` | Imports `SITE_SETTINGS.showNextCard` | Take the flag as a prop. |
| `src/components/sections/Certifications.tsx`, `Achievements.tsx` | Type imports only; `Achievements` calls `txt()` | Accept pre-resolved strings from the adapter. |
| `src/components/ui/MiniUI.tsx`, `Work.tsx` | Type import `ProjectKind` | Types move to `packages/types`. |
| `src/app/robots.ts`, `sitemap.ts` | `SITE_SETTINGS.siteUrl` | Read site URL from the API (fallback to env). |
| `Hero.tsx`, `IdCard.tsx`, `Skills.tsx`, `Contact.tsx`, `Timeline.tsx`, `Navigation.tsx` | Props only | None. |

## 4. Existing content dependencies (hardcoded values)

All in `src/lib/data.ts` unless noted.

- **Names and identity:** full name, display name, first name, initials, title, role line, expertise, audience (Arabic variants included).
- **Copy drafts:** hero intro, summary, bio, three tagline options (all `awaiting_approval`).
- **Projects:** 8 records (title, kind, live link, description drafts, empty features/technologies).
- **Skills, experience, education, certifications, achievements:** empty arrays (pending owner data); sample data lives in `sample-data.ts` and must never reach the database.
- **Social links:** GitHub and LinkedIn. **Email** in `CONTACT`.
- **Images and media:** `avatarImage`, `heroPoster`, `heroVideo` paths, project `screenshot` (null).
- **Section visibility:** `SITE_SETTINGS.sections`; navigation order and labels in `NAV`.
- **SEO:** `SITE_SETTINGS.meta` title and description; `siteUrl` from env.
- **UI strings:** `src/lib/i18n.ts` (interface wording, not personal content; stays in code).
- **ID card:** header text in `PROFILE.idCard`; barcode is generated, not data.

## 5. Potential migration risks

| Risk | Mitigation |
| --- | --- |
| Visual regression when data flows through an adapter | The adapter outputs the exact existing shapes (`Content`, `ProjectView`, `SkillView`); compare screenshots before and after each section swap |
| Static export currently gives instant, build-time pages; API fetching can slow or break rendering | Server-side fetch with tags and revalidation; static fallback from `data.ts` if the API is unreachable at build time |
| Per-copy approval states (`confirmed`, `awaiting_approval`, `draft`) have no database equivalent | Map to PUBLISHED / DRAFT; missing and excluded are not imported |
| Arabic is first-class | Paired English/Arabic columns, English fallback preserved |
| Windows Application Control blocks native binaries (already blocked Next's SWC) | Prisma through the `mariadb` driver adapter, argon2id through WASM, `image-size` instead of sharp; verify early |
| `git mv` of every file touches import paths and config | Baseline commit first; move in groups; web must build and render identically after each group |
| Owner's project sheet contains plaintext credentials | Never imported, never logged, never in docs or seed (existing rule) |
| Sample content leaking into the database | `sample-data.ts` is excluded from the import script |
| Section numbering and navigation assume a fixed order | Derive both from the database `SectionSetting` order, keep stable section ids |
| Hero video is processed offline | Pipeline stays as is; outputs are registered as Media rows |

## 6. Assets that must be preserved

- `public/hero/hero.mp4`, `hero.webm`, `hero-poster.webp` (audio fixed; do not regenerate unless asked).
- `public/portrait-bust.webp`, `public/og.jpg`, `src/app/icon.png`, `src/app/favicon.ico`.
- `public/logos/*.svg` and `LICENSE-devicon.txt`.
- `src/fonts/*` and `LICENSES.txt`.
- Owner source media in the repository root (needed by `scripts/build-hero-assets.py`).
- `content/discovery.md` and `content/pending-questions.md` (extended, never replaced).

## 7. Proposed restructuring plan

1. Baseline commit (done).
2. Create the pnpm workspace root; move the current app to `apps/web` with `git mv`.
3. Verify `apps/web` builds and renders identically.
4. Add `packages/types` (types lifted from `data.ts`) and `packages/validation`.
5. Add `apps/api`, then `apps/admin`.
6. Add `packages/api-client`; switch the web app section by section to API data.
7. Retire `data.ts` content only after the import is verified and the owner confirms.

## 8. Files to move

| From | To |
| --- | --- |
| `src/**` | `apps/web/src/**` (structure inside kept; see below) |
| `public/**` | `apps/web/public/**` |
| `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `next-env.d.ts` | `apps/web/` |
| `scripts/build-hero-assets.py` | stays in root `scripts/`; output paths updated to `apps/web/public` |
| owner source media | `scripts/source-media/` |

Inside `apps/web/src`, the existing layout is kept (`app/[locale]`, `components`, `lib`, `fonts`).
The brief's deeper tree (`features/`, `components/layout/`, etc.) is adopted only where it holds
real files, to avoid churn in a working site.

## 9. Files to refactor

`page.tsx`, `layout.tsx`, `robots.ts`, `sitemap.ts`, `About.tsx`, `Experience.tsx`, `Certifications.tsx`,
`Achievements.tsx`, `content.ts` (becomes the adapter and fallback), `data.ts` (types move out,
values stay as import source), `package.json` (split per workspace), root `.gitignore`, `README.md`.

## 10. Files that must remain unchanged

All visual components and their CSS Modules: `Hero`, `IdCard`, `Skills`, `Work`, `Timeline`,
`Contact`, `Footer`, `Navigation`, `MiniUI`, `TechLogo`, `Reveal`, `SectionHeading`, `App`;
`globals.css`, `scroll.tsx`, `hooks.ts`, `i18n.ts`; all fonts and media.

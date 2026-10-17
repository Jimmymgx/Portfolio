# Mohamed Gamal — Portfolio

Bilingual (English and Arabic, RTL) personal portfolio built with Next.js 15, React 19,
TypeScript and Tailwind CSS 4. Motion uses CSS, IntersectionObserver and
`requestAnimationFrame` only, plus Lenis for smooth scrolling. No GSAP, Three.js or WebGL.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  (redirects to /en; Arabic is /ar)
npm run build      # production build
npm start          # serve the production build
npm run typecheck
```

### Review modes

| Command | Shows |
| --- | --- |
| `NEXT_PUBLIC_SHOW_DRAFTS=1 npm run dev` | Unapproved drafts (hero intro, bio, project descriptions) with a DRAFT tag |
| `NEXT_PUBLIC_SAMPLE_CONTENT=1 npm run dev` | Clearly fake sample skills, experience, certifications and achievements, only for testing layout. A banner says "NOT REAL". Never enable in production. |

On Windows PowerShell use `$env:NEXT_PUBLIC_SHOW_DRAFTS="1"; npm run dev`.

## Where content lives

Everything personal is in [src/lib/data.ts](src/lib/data.ts). Components read from it and
never hardcode personal facts. Every entry has a status:

`confirmed` · `draft` · `awaiting_approval` · `missing` · `excluded`

Only `confirmed` content is published. Approve a draft by changing its status to
`"confirmed"`. Empty sections disappear from the page and the navigation automatically,
and section numbers ("03 — Selected Work") follow the published order.

Tracking files: [content/discovery.md](content/discovery.md) (what was confirmed, drafted, excluded)
and [content/pending-questions.md](content/pending-questions.md) (open questions).

## Common edits

- **Personal info, tagline, bio:** edit `PROFILE`. Pick a tagline from `taglineOptions`, copy it into `tagline`, set its status to `confirmed`.
- **Links:** edit `SOCIAL_LINKS` (GitHub, LinkedIn, Behance, Dribbble, website) and `CONTACT`.
- **Skills:** add groups and skills to `SKILL_GROUPS`. Each skill has an `id`, `name`, 1–3 letter `symbol`, optional `logo` key and `projectIds`. Logo keys come from `BRAND` and `CONCEPT` in [src/components/ui/TechLogo.tsx](src/components/ui/TechLogo.tsx). Brand SVGs are in `public/logos` (Devicon, MIT licence, included). No proficiency levels are shown.
- **Projects:** add an object to `PROJECTS` (`id`, `title`, `kind`, `description`, `features`, `technologies`, `links`, `screenshot`). Order in the array is the gallery order.
- **Replace project visuals:** put an image in `public/projects/` and set `screenshot: "/projects/my-project.webp"`. Without one, a generic visual labelled "Illustrative UI" is shown.
- **Experience and education:** fill `EXPERIENCE` and `EDUCATION`. They merge into one timeline, newest first.
- **Certifications and achievements:** fill `CERTIFICATIONS` / `ACHIEVEMENTS` and set the section to `true` in `SITE_SETTINGS.sections`. Achievement figures must be exact numbers you confirm.
- **Section visibility:** `SITE_SETTINGS.sections`. A section also hides itself when it has no confirmed content.
- **Domain and SEO:** set `NEXT_PUBLIC_SITE_URL` (for example `https://example.com`) at build time. Canonical, alternate languages, sitemap and absolute Open Graph URLs switch on automatically.
- **Résumé button:** set `PROFILE.resumeUrl` to a file under `public/`.
- **Interface wording and Arabic labels:** [src/lib/i18n.ts](src/lib/i18n.ts).

## Replace the hero video and portrait

The hero uses processed files in `public/hero/` plus `public/portrait-bust.webp` and `public/og.jpg`.
Rebuild them from new source files:

```bash
pip install imageio-ffmpeg numpy pillow      # FFmpeg on PATH also works
python scripts/build-hero-assets.py --video path/to/intro.mp4 --image path/to/portrait.jpg
```

Options: `--crop-x` (left edge of the crop), `--loop-fade 0.5` (seamless-loop crossfade, `0` disables),
`--max-seconds 10`, `--no-levels` (skip the background levels correction), `--bust x,y,width`
(head-and-shoulders crop of the image). To remove the video entirely set `PROFILE.heroVideo` to `null`.

Playback behaviour: muted autoplay only where the browser allows it, sound only after the
visitor presses the sound button, pause and silence when less than about 35% of the hero is
visible, no autoplay with reduced motion.

The supplied media are stylized avatars. The site labels them "Illustrated avatar" and never
presents them as photographs.

## Structure

```text
src/app/[locale]/   layout (fonts, metadata, html lang/dir) and page composition
src/components/     Navigation, App, hero/, sections/, ui/
src/lib/            data.ts (content), content.ts (status gating), i18n.ts, hooks.ts, scroll.tsx
src/fonts/          self-hosted woff2 (Inter Tight, Instrument Serif, JetBrains Mono, IBM Plex Sans Arabic)
public/             hero/, logos/, projects/, portrait-bust.webp, og.jpg
scripts/            build-hero-assets.py
content/            discovery.md, pending-questions.md
```

Routes are `/en` and `/ar` (`/` redirects to `/en`). The folder layout differs slightly from the
brief (`app/[locale]/` instead of `app/layout.tsx`) because of the two languages.

## Deploy

Any Node host works. Static HTML is generated for both languages, so Vercel, Netlify or a Node
server with `npm run build && npm start` all fit.

1. Set `NEXT_PUBLIC_SITE_URL` to the production domain.
2. Run `npm run build` and fix any reported error.
3. Review once with `NEXT_PUBLIC_SHOW_DRAFTS=1`, approve or remove drafts, then build without it.
4. Check `/robots.txt` and `/sitemap.xml` after deploy.

Do not set `NEXT_PUBLIC_SAMPLE_CONTENT` in production.

## Checks run on the production build

Local run of the final build on Windows with Chrome and Playwright. Lighthouse scores were taken
with the default (non-review) content.

| Check | Result |
| --- | --- |
| `next build`, `tsc --noEmit` | Pass |
| First load JavaScript (page) | 125 kB, shared chunks 103 kB |
| Lighthouse mobile (English) | Performance 95, Accessibility 100, Best practices 100, SEO 100 |
| Lighthouse desktop (English and Arabic) | Performance 100, Accessibility 100, Best practices 100, SEO 100 |
| Horizontal overflow, 360 to 2560 wide, English and Arabic | None |
| Console errors during core interactions | None |
| Interaction tests (with sample content): video autoplay, pause and resume, sound toggle, nav, mobile menu, ID card flip, skill filter and inspector, project accordion with keyboard, copy email, timeline, reduced motion | 26 of 26 pass |

Known limits: the Skills and Experience sections were verified with sample data only, because
the real entries are still pending. Some Windows machines block Next's native compiler
(Application Control policy). Next falls back to its WebAssembly compiler and the build still works.

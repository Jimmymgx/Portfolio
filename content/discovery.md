# Discovery log — Mohamed Gamal portfolio

Single source of truth for what the owner told us. Everything published on the site
comes from `src/lib/data.ts`; this file explains where each value came from and what
still needs approval.

Statuses: `confirmed` · `draft` · `awaiting_approval` · `missing` · `excluded`

> Not used as sources: any résumé file. The owner's project sheet was used for project
> names, types and public links only. Credentials, engineer names and internal notes in
> that sheet were deliberately NOT copied anywhere in this repository. The owner should
> rotate the logins listed in that sheet and restrict who can open it.

## Confirmed (from the owner's direct answers)

| Item | Value | Status |
| --- | --- | --- |
| Full name | Mohamed Gamal | confirmed |
| Display name | Mohamed Gamal | confirmed |
| Professional title | Fullstack Developer | confirmed |
| Public role line | FullStack Developer \| Project Manager | confirmed |
| Primary expertise | Web apps (frontend + backend) | confirmed |
| Target audience | Freelance clients | confirmed |
| Site languages | English + Arabic | confirmed |
| Email | mohamedgamal.01199@gmail.com | confirmed |
| GitHub | https://github.com/Jimmymgx/ | confirmed |
| LinkedIn | https://www.linkedin.com/in/mohamed-gamal-developer/ | confirmed |
| Sections requested | Experience, Education (plus Hero, About, Skills, Work, Contact) | confirmed |
| Featured projects | 8 | confirmed (owner chose "8 featured") |
| Project attribution | Shown as the owner's own work; no engineer names | confirmed |
| Repo links | Decide later (hidden for now) | confirmed |
| Skill categories | Languages + Frontend, Backend + Databases, Project management + concepts | confirmed |
| Strongest skills | None highlighted | confirmed |
| Media | Avatar image and avatar intro video supplied by the owner | confirmed |

## Projects (names, types, links from the owner's sheet)

| # | Title | Type | Live link | Description |
| --- | --- | --- | --- | --- |
| 1 | UniVolta | Website | https://uni-volta.com | draft from live page, awaiting_approval |
| 2 | V-Fit | Website + Mobile App | https://vfitapp.online/ | missing (page shows only a title) |
| 3 | Lomi | Website + Mobile App | https://lomi.com.eg/ | draft from live page, awaiting_approval |
| 4 | Nour Stream | Website | https://nourchannels.com/ | draft from live page, awaiting_approval |
| 5 | Rattel | Mobile + system | https://rattelapp.com/ | draft from live page, awaiting_approval |
| 6 | Wasla E-Commerce | Website + Mobile App | https://wasla-e-commerce.vercel.app/ | draft from live page, awaiting_approval |
| 7 | Logistina | System | none in sheet | missing |
| 8 | Masar El Nogoome | Mobile App | none public (sheet lists a dashboard only) | missing |

Not featured but listed in the sheet: dr-law, plus the long list of company sites on the
second tab. Add any of them in `PROJECTS` if wanted.

## Drafts awaiting approval (visible only in review mode)

Review mode: `NEXT_PUBLIC_SHOW_DRAFTS=1 npm run dev`. Each draft shows a DRAFT tag.
To approve, change its `status` to `"confirmed"` in `src/lib/data.ts`.

- Tagline options (pick one, then copy it into `PROFILE.tagline`):
  1. Fullstack developer building web apps, end to end.
  2. Web apps, built and managed from first brief to launch.
  3. Frontend, backend and project management for freelance clients.
- Hero intro, About summary and biography (derived only from the owner's answers).
- Project descriptions (above), English and Arabic.
- SEO meta description (falls back to the role line until approved).
- Arabic translations of confirmed names and titles (محمد جمال, مطوّر Full Stack, مدير مشاريع).

## Missing / pending

See `content/pending-questions.md`.

## Excluded

- Certifications section (owner did not select it).
- Achievements section (owner did not select it).
- Location, phone, WhatsApp, résumé download, quote, philosophy (not provided).
- Behance, Dribbble, other links (not provided).

## Design decisions made without asking (defaults from the brief)

- Palette, typography and animation system exactly as specified in the brief.
- Arabic font: IBM Plex Sans Arabic (working default, direction still to confirm).
- Avatar is labelled "Illustrated avatar" everywhere. It is never presented as a photograph.
- Project visuals are generic CSS mini-interfaces labelled "Illustrative UI" until real screenshots are supplied.
- ID card header "DEVELOPER ID". No invented ID number, department or expiry.

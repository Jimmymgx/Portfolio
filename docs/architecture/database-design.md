# Database design

MySQL 8 / MariaDB 10.6+, character set `utf8mb4` (required for Arabic). The schema is `apps/api/prisma/schema.prisma`.
The initial migration SQL is prepared in `apps/api/prisma/migrations/20261017000000_init/migration.sql` and has **not** been applied anywhere.

## Conventions

| Topic | Rule |
| --- | --- |
| Bilingual text | `field` (English, required for core fields) + `fieldAr` (optional). Public API falls back to English. |
| Content lifecycle | Collections: `status` ∈ DRAFT, PUBLISHED, UNPUBLISHED. Hidden means UNPUBLISHED. |
| Singletons | Two rows each, unique on `state` ∈ DRAFT, PUBLISHED (SEO is unique on `pageKey` + `state`). |
| Structure flags | `isEnabled` and `isVisible` only on `SectionSetting` and `NavigationItem`. |
| Identifiers | Auto-increment integers for content. `cuid` strings for users, sessions, messages and audit rows. |
| Ordering | `sortOrder` integer on every ordered collection. Reordering is one transactional call. |
| Deletion | Media and category references use `Restrict`. Join rows and child rows (features, project media) cascade from their project. Actor links on audit rows and uploads use `SetNull`. |
| Secrets | Passwords are stored only as argon2id hashes. Session tokens only as SHA-256. Audit metadata never holds secrets. |

## Models (26)

| Group | Models |
| --- | --- |
| Access | `AdminUser`, `AdminSession`, `AuditLog` |
| Media | `Media` |
| Singletons | `Profile`, `Hero`, `About`, `ContactSettings`, `SiteSettings`, `SeoSettings` |
| About | `AboutFact` |
| Skills | `SkillCategory`, `Skill` |
| Projects | `ProjectCategory`, `Project`, `ProjectFeature`, `ProjectMedia`, `ProjectSkill` |
| Career | `Experience`, `Education`, `Certification`, `Achievement` |
| Links and inbox | `SocialLink`, `ContactMessage` |
| Structure | `NavigationItem`, `SectionSetting` |

## Relationships

```text
AdminUser 1─∞ AdminSession          AdminUser 1─∞ AuditLog (SetNull)     AdminUser 1─∞ Media (uploadedBy, SetNull)
SkillCategory 1─∞ Skill (Restrict)   ProjectCategory 1─∞ Project (Restrict)
Project 1─∞ ProjectFeature (Cascade) Project 1─∞ ProjectMedia (Cascade) ─∞─1 Media (Restrict)
Project ∞─∞ Skill via ProjectSkill (composite key projectId+skillId, both Cascade on the join row only)
Media referenced (Restrict) by: Profile (avatar, résumé), Hero (mp4, webm, poster, fallback), About (portrait),
  Skill (logo), Project (og image), ProjectMedia, Certification, Achievement, SeoSettings (og image), SiteSettings (favicon, logo)
```

Deleting a skill removes only its `ProjectSkill` rows, never projects. Deleting a project removes its features, media links and skill links, never the media files.

## Fields added beyond the brief, and why

| Field | Reason |
| --- | --- |
| `Profile.firstName`, `initials` | Hero ghost word and navigation mark already exist on the site. |
| `Profile.roleLine`, `expertise`, `audience`, `location` | Quick facts and ID card back already read these. |
| `Hero.backgroundWord` empty → profile first name | Keeps today's behaviour with no extra typing. |
| `About.idCardPortraitMediaId` | Brief lists an ID card portrait but no column. |
| `ProjectCategory.visualKind` | Selects the generic "Illustrative UI" variant (website, web+mobile, mobile, system). |
| `Project.stage` | Brief's "status" is publishing; the project's own state needs a separate field. |
| `Project.seo*`, `ogImageMediaId`, `canonicalUrl` | Project editor has an SEO tab. |
| `SocialLink.handle` | Contact list shows a username next to each link. |
| `Skill.externalLogoReference`, `Achievement.logoKey` | Keys of the bundled brand logos in `public/logos`. |
| `ContactMessage.ipHash` | Spam review and rate limiting without storing raw IPs. |
| `AuditLog.actorEmail` | Keeps who did it readable after an account is removed. |
| `ProjectMedia (projectId, mediaId)` unique | Prevents attaching the same file twice. |

## Mapping from the static content

| Static source | Table |
| --- | --- |
| `PROFILE` | `Profile` (PUBLISHED row for confirmed copy, DRAFT row for `awaiting_approval`) |
| `PROFILE.intro`, hero media paths | `Hero` |
| `PROFILE.bio`, `idCard`, quote | `About` |
| `PROJECTS`, `PROJECT_KINDS` | `Project`, `ProjectCategory` |
| `SKILL_GROUPS` | `SkillCategory`, `Skill`, `ProjectSkill` |
| `EXPERIENCE`, `EDUCATION`, `CERTIFICATIONS`, `ACHIEVEMENTS` | matching tables |
| `SOCIAL_LINKS`, `CONTACT` | `SocialLink`, `ContactSettings` |
| `NAV`, `SITE_SETTINGS.sections` | `NavigationItem`, `SectionSetting` |
| `SITE_SETTINGS.meta` | `SeoSettings` (home) |
| `public/*` assets | `Media` (storage provider LOCAL, same URLs) |
| Anything with status `missing` or `excluded`, and all of `sample-data.ts` | not imported |

## Indexing

Every foreign key has an index. Public queries are served by `(status, sortOrder)` composites. Slugs and storage keys are unique.

## Applying the schema

See `docs/deployment/database-setup.md`. Nothing is applied automatically.

# Folder structure

Status: implemented. `apps/web` was moved with `git mv` (history preserved).
Folders are created only when they hold real files; the brief's tree is a target, not a checklist.

```text
portfolio-platform/
├── apps/
│   ├── web/                       public site (moved from the repository root; components unchanged)
│   │   ├── public/                hero/, logos/, og.jpg, portrait-bust.webp (static fallback assets)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── [locale]/      layout.tsx (fonts, metadata), page.tsx (section registry)
│   │       │   ├── api/           revalidate/ and preview/ route handlers
│   │       │   └── robots.ts, sitemap.ts, globals.css, icon
│   │       ├── components/        App, Navigation, hero/, sections/ (+ ContactForm, Maintenance), ui/
│   │       ├── fonts/
│   │       └── lib/               api.ts, site-model.ts, data.ts (static fallback), content.ts, i18n.ts, hooks.ts, scroll.tsx
│   ├── admin/                     CMS dashboard (Next.js, :3001)
│   │   └── src/
│   │       ├── app/               (auth)/login, (dashboard)/<one folder per CMS page>
│   │       ├── components/        shell, providers, ui/ (button, input, dialogs, tabs, tables), forms/ (fields, media picker), resource/ (generic list and singleton pages)
│   │       ├── features/projects/ project editor with tabs
│   │       └── lib/               api.ts, auth.tsx, unsaved.tsx, roles.ts, utils.ts
│   └── api/                       Express API (:4000)
│       ├── prisma/                schema.prisma, migrations/ (prepared, not applied)
│       ├── scripts/               create-admin.ts, import-static-content.ts
│       ├── tests/                 Vitest + Supertest with a fake database, upload security tests
│       ├── uploads/               local media (git-ignored contents)
│       └── src/
│           ├── app.ts, server.ts, routes/ (index, admin)
│           ├── config/            env, database, cors, swagger
│           ├── common/            crud/, errors/, responses/, pagination/, storage/, utils/, openapi.ts, logger.ts
│           ├── middlewares/       auth, authorize, csrf, validate, error, rate-limit
│           ├── services/          revalidation
│           └── modules/           auth, users, profile (singletons), skills, projects, career, social-links, media,
│                                  navigation (sections), messages, settings (dashboard), audit-logs, public
├── packages/
│   ├── validation/                shared Zod schemas
│   ├── types/                     shared TypeScript contracts
│   ├── api-client/                public and admin clients
│   └── config/                    shared tsconfig preset and default ports
├── scripts/
│   ├── build-hero-assets.py       hero video pipeline (writes to apps/web/public)
│   └── source-media/              owner's original video and image
├── docs/                          architecture/, api/, cms/, deployment/
├── content/                       discovery.md, pending-questions.md
├── .env.example, .gitignore
├── pnpm-workspace.yaml, package.json, tsconfig.base.json
└── README.md
```

## Moves performed

| From | To |
| --- | --- |
| `src/**` | `apps/web/src/**` |
| `public/**` | `apps/web/public/**` |
| `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `package.json` | `apps/web/` |
| owner source video and image | `scripts/source-media/` |
| `package-lock.json` | removed, replaced by `pnpm-lock.yaml` |

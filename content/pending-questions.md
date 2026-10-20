# Pending questions

Priorities: Critical · Important · Optional
Statuses: Pending · Answered · Approved · Skipped · No longer required

| ID | Section | Question | Why | Priority | Milestone | Status | Answer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Q-001 | Experience | Paste your work history (company, role, dates, main responsibilities). LinkedIn cannot be read automatically. | Experience section is hidden until data exists. | Critical | Content review | Pending | |
| Q-002 | Education | Paste your education (institution, qualification, field, graduation year). | Education appears in the same timeline. | Critical | Content review | Pending | |
| Q-003 | Skills | Which exact technologies for: Languages + Frontend, Backend + Databases, Project management + concepts? | Skills section is hidden until skills are confirmed. | Critical | Content review | Pending | |
| Q-004 | Skills | Which skills belong to which projects? | Powers the "Used in" panel in the skills inspector. | Optional | Content review | Pending | |
| Q-005 | Hero / About | Approve or edit the hero intro, About summary and biography drafts. | Hidden in production until approved. | Important | Content review | Pending | |
| Q-006 | Hero | Choose one of the three tagline drafts or write your own. | Tagline not shown until approved. | Important | Content review | Pending | |
| Q-007 | About | Your professional philosophy and long-term goals (or approve a draft once you give a few words). | You asked for drafts, but there is not enough material yet. | Optional | Content review | Pending | |
| Q-008 | Work | Approve or edit the five project descriptions drafted from live pages. | Hidden in production until approved. | Important | Content review | Pending | |
| Q-009 | Work | For V-Fit, Logistina and Masar El Nogoome: short description, your role, features, technologies. | Public pages show almost nothing. | Important | Content review | Pending | |
| Q-010 | Work | Public live links for Logistina and Masar El Nogoome (the sheet gives none or only an admin dashboard). | Cards show no link until provided. | Optional | Content review | Pending | |
| Q-011 | Work | Real screenshots per project, or keep the labelled "Illustrative UI" visuals? | Real images are not available. | Important | Content review | Pending | |
| Q-012 | Work | Should the repository links (QeemaTech organization) be shown? Are they public? | They may be private. | Optional | Content review | Pending | |
| Q-013 | Media | Confirm the avatar (image and video) is what you want as hero, ID card portrait and social image. | Both are stylized avatars, labelled as such. | Important | Content review | Pending | |
| Q-014 | Design | Arabic typography direction (current default: IBM Plex Sans Arabic). | Your brief asks before choosing Arabic fonts. | Important | Content review | Pending | |
| Q-015 | Language | Review the Arabic translations (name, titles, UI labels, drafts). | Written by an assistant, not a native review. | Important | Content review | Pending | |
| Q-016 | About | Location to display (city and country) and any quote or closing phrase for the ID card back. | Hidden until provided. | Optional | Content review | Pending | |
| Q-017 | Contact | Public phone or WhatsApp? | Hidden until provided. | Optional | Pre-launch | Pending | |
| Q-018 | About | Résumé download: provide a file, or leave it out? | No file provided. | Optional | Pre-launch | Pending | |
| Q-019 | Launch | Production domain and canonical URL. | Needed for canonical tags, sitemap and absolute Open Graph URLs. | Important | Pre-launch | Pending | |
| Q-020 | Launch | Analytics preference (none by default) and hosting target. | None configured. | Optional | Pre-launch | Pending | |
| Q-021 | Security | Rotate the admin passwords in your project sheet and restrict its sharing. | The sheet stores logins in plain text. | Critical | Now | Pending | |
| Q-022 | Experience | Add the optional "Next — Your Team?" closing card to the timeline? | Needs your approval. | Optional | Pre-launch | Pending | |
| Q-023 | CMS | Will more than one person use the CMS? (Built for multiple admins with SUPER_ADMIN, EDITOR, VIEWER; the first admin is created by a one-time command.) | Affects user management defaults. | Optional | CMS | Pending | Default applied: multi-user |
| Q-024 | Deployment | Production hosting for the website, dashboard, API and MySQL. | Decides environment files, cookie domain and CORS. | Important | Pre-launch | Pending | |
| Q-025 | Media | Which S3-compatible provider for production media (AWS S3, Cloudflare R2, MinIO, other)? | Local disk is used in development only. | Important | Pre-launch | Pending | |
| Q-026 | Contact | Should the contact form send email notifications, or only store messages in the CMS? | No email service is configured. | Optional | CMS | Pending | Default applied: store only |
| Q-027 | Deployment | Should the dashboard live on a subdomain (for example admin.yourdomain)? | Cookie scope and CORS. | Optional | Pre-launch | Pending | Default applied: separate app |
| Q-028 | CMS | Do you need scheduled publication (publish at a future date)? | Not built unless requested. | Optional | CMS | Pending | Default applied: no |
| Q-029 | Database | Authorization to create the local `portfolio` database and run the prepared migration on the XAMPP MySQL. | Needed to use the CMS locally. | Critical | CMS | Answered | Owner authorized a throwaway test database only (created, tested, then removed). Your real `portfolio` database is not created: run the steps in `docs/deployment/database-setup.md`. |
| Q-030 | CMS | Is plain multi-line text enough for bios and descriptions (no bold, links or lists inside text)? | Rich HTML would require changes to the public components. | Optional | CMS | Pending | Default applied: plain text |

## Answered

| ID | Question | Answer |
| --- | --- | --- |
| A-001 | Name, display name, title | Mohamed Gamal / Mohamed Gamal / Fullstack Developer |
| A-002 | Languages | English + Arabic |
| A-003 | Tagline | Draft three options for approval |
| A-004 | Links and email | GitHub, LinkedIn and email as listed in discovery.md |
| A-005 | Expertise, role, audience | Web apps (frontend + backend); "FullStack Developer \| Project Manager"; freelance clients |
| A-006 | Philosophy and goals | Draft for approval |
| A-007 | Skill categories | Languages + Frontend, Backend + Databases, Project management + concepts; none highlighted |
| A-008 | Projects source | Owner's project sheet (links only); descriptions drafted from live sites |
| A-009 | Sections | Experience and Education; no certifications or achievements |
| A-010 | Project count and attribution | 8 featured; show as the owner's own work, no engineer names |
| A-011 | Repo links | Decide later |
| A-012 | Media | Avatar image and video supplied |
| A-013 | How should Arabic be stored in the database? | Paired columns (English + Arabic) |
| A-014 | Which MySQL for local development? | The running XAMPP MySQL, new `portfolio` database |
| A-015 | Media storage | Local disk now, S3-compatible later |
| A-016 | Tooling | pnpm workspaces and one baseline git commit before restructuring (done) |
| A-017 | May the assistant create a database to test end to end? | Yes, a throwaway test database only. The real database is created by the owner. |

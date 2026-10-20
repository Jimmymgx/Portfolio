# Publishing workflow

Nothing you do in the CMS is visible to visitors until it is published. The CMS has two kinds of content and two simple rules.

## Single items: draft first, then publish

Profile, Hero, About, Contact, Site settings and SEO are stored twice: the **live** version and your **draft**.

1. Edit and press **Save draft**. The live site does not change.
2. Press **Preview** to open the site with your draft in place (a banner says it is a preview).
3. Press **Publish** and confirm. The draft replaces the live version and the website refreshes within a second.
4. Changed your mind? **Discard changes** throws the draft away and returns to the live version.

The badge at the top tells you where you are: *Not published yet*, *Has unpublished changes*, or *Live and up to date*.

## Lists: each item has its own status

Projects, skills, categories, experience, education, certifications, achievements, social links and quick facts each have a status:

| Status | Meaning |
| --- | --- |
| **Draft** | Private. New items start here. |
| **Published** | Visible on the website. |
| **Unpublished** | Hidden again, but kept (nothing is deleted). |

Use **Publish** / **Unpublish** in the row menu (or the buttons in the project editor). Editing a published item changes it on the site as soon as you save, so for larger rewrites duplicate the project (it creates a draft copy), edit the copy, then swap them.

## What happens to the website

- The API tells the website to refresh after every publish, unpublish, reorder and settings change.
- If that signal is ever lost, pages refresh by themselves within five minutes.
- **Settings → Website → Refresh now** forces it.
- Search engines only ever see published content. Preview pages are marked `noindex`.

## Hiding a whole section

**Sections & navigation** switches sections on and off and sets their order. A hidden section disappears from the page, the menu and the numbering; its content stays in the database. A section also stays hidden on its own when it has no published content (for example Skills before you add any).

## Preview links

**Preview drafts** in the top bar (or **Preview** on any page) creates a link that works for 30 minutes and shows unpublished drafts. Do not share it: anyone with the link sees your drafts until it expires.

## Maintenance mode

**Settings → Site → Maintenance mode**, then publish. Visitors see a short "Back soon" page. Previews still show the real site.

## Audit trail

Every save, publish, delete and sign-in is recorded (who, what, when) and visible to super administrators under **Audit log**. The log stores which fields changed, never passwords, tokens or message text.

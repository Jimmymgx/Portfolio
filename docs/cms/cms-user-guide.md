# CMS user guide

For the person who owns the website. No coding needed.

## Signing in

Open the dashboard (locally http://localhost:3001) and sign in with the account created for you. Your session lasts 12 hours; you can sign out with the button at the top right. Passwords need at least 12 characters with upper case, lower case and a number. Change yours under **Settings → Account**.

Your role decides what you can do:

| Role | What you see |
| --- | --- |
| Viewer | Everything, read only (buttons for changing things are hidden) |
| Editor | Edit, publish and delete content and media |
| Super administrator | Also Users, the Audit log and deleting messages |

## Finding your way

The left menu groups the pages:

- **Dashboard**: real numbers (projects, skills, media, new messages), recent activity and quick actions. Nothing is invented.
- **Content**: Profile, Hero, About, Skills, Projects, Experience, Education, Certifications, Achievements, Contact, Social links.
- **Website**: Media library, Sections & navigation, SEO, Messages, Settings.
- **Administration** (super administrators): Users, Audit log.

On a phone the menu opens with the button at the top left.

## English and Arabic

Almost every text field has an English box and an Arabic box next to each other. English is required for main fields; if you leave Arabic empty, visitors on the Arabic site see the English text. Nothing is translated for you.

## Common tasks

### Add a project

1. **Projects → New project**.
2. **General**: title (English and Arabic), category, short description. The category decides which illustrative picture is shown when you have no screenshot.
3. **Details**, **Technologies** (chosen from your Skills), **Links** (live site, public repository).
4. **Save**, then open **Features** and **Media** to add key points and images. Mark one image as the cover. If an image is an illustration and not a real screenshot, tick that box so the site labels it honestly.
5. Press **Publish** at the top. Check the result with **Preview** or on the site.

Order the projects by dragging the grip handle in the list, or use **Move up / Move down** in the row menu (works with the keyboard too).

### Add a skill

**Skills → Categories** first (for example Languages, Frontend), then **Skills → New skill**: name, a one to three letter symbol for the tile, category, and a logo (upload one, or type a bundled key such as `react`). Link it to projects so the inspector panel shows where it is used. No skill levels or percentages are ever shown.

### Upload and manage images

**Media library → Upload files** (or drag files onto the page). Uploading the same file twice reuses the first copy. Open a file to add its title and alt text (describe the image for people who cannot see it), copy its address, replace the file (everything using it updates), or delete it. A file in use cannot be deleted: the message tells you where it is used.

### Edit your profile, hero and About

Open the page, edit, **Save draft**, **Preview**, **Publish**. See [publishing-workflow.md](publishing-workflow.md).

### Turn the contact form on

**Contact**: switch on *Enable the contact form*, publish. Messages arrive under **Messages** (new ones are bold, with a count in the menu). The CMS stores them; it does not send email. Open a message to read it, reply by email, archive it or (super administrators) delete it.

### Show or hide a section

**Sections & navigation**: use the switch next to a section, or move it up and down. The hero always stays first.

### Add people

Super administrators: **Users → New user**. Give editors the *Editor* role. Disabling a user signs them out at once.

## Good to know

- Unsaved changes are protected: if you try to leave a page with edits, you are asked first.
- Errors appear next to the field that needs fixing.
- Deleting always asks for confirmation. Deleting a project never deletes its image files.
- The audit log (super administrators) shows who changed what.

## If something looks wrong

| You see | Try |
| --- | --- |
| The website did not update | Settings → Website → Refresh now. Still old after five minutes: ask whoever hosts it to check that the API and website share the same revalidation secret. |
| "Your session has expired" | Sign in again. |
| A file will not upload | Check the type and size (images 8 MB, videos 80 MB, PDFs 15 MB). SVG with scripts is refused. |
| The page shows an error panel | Press Try again. If it persists, the API or database may be down. |

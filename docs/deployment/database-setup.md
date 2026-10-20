# Database setup

The platform uses **MySQL 8** or **MariaDB 10.6+** (verified on MariaDB 10.4 as shipped with XAMPP) with the `utf8mb4` character set, which Arabic text needs.

**Nothing in this repository creates a database, applies a migration or seeds data by itself.** You run each step below on purpose.

## 1. Create an empty database and a limited user

Run as a MySQL administrator (for XAMPP: `C:\xampp\mysql\bin\mysql.exe -u root`). Pick your own password.

```sql
CREATE DATABASE portfolio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'portfolio'@'localhost' IDENTIFIED BY 'choose-a-long-random-password';
GRANT ALL PRIVILEGES ON portfolio.* TO 'portfolio'@'localhost';
FLUSH PRIVILEGES;
```

The user can only touch the `portfolio` database. Prisma needs `ALL` on it to create tables during migration; after the first deploy you may reduce it to `SELECT, INSERT, UPDATE, DELETE` if your hosting allows running migrations as a different user.

For a remote server use the application server's address instead of `localhost`, and require TLS (`?ssl=true` on the connection string).

## 2. Configure the connection

In the repository root `.env` (copied from `.env.example`):

```env
DATABASE_URL=mysql://portfolio:choose-a-long-random-password@127.0.0.1:3306/portfolio
```

URL-encode special characters in the password (`@` becomes `%40`).

## 3. Review, then apply the migration

The initial migration is `apps/api/prisma/migrations/20261017000000_init/migration.sql`. It only creates the 26 tables, indexes and foreign keys. Read it first if you like.

```bash
pnpm db:validate      # checks the Prisma schema (no database needed)
pnpm db:migrate       # applies pending migrations: prisma migrate deploy
```

`migrate deploy` applies exactly the committed migration files and never resets or drops anything. Do not use `prisma migrate dev` or `prisma db push` on a database that holds real content.

## 4. Create the first administrator

There is no default account. Run the command and type a password of at least 12 characters (upper case, lower case and a number) at the hidden prompt:

```bash
pnpm admin:create -- --email you@example.com --name "Your Name"
```

For automation: `ADMIN_PASSWORD=... pnpm admin:create -- --non-interactive --email ... --name ...`.

## 5. (Optional) Import the existing website content

Your current static content lives in `apps/web/src/lib/data.ts`. To load it into the database once:

```bash
pnpm content:import -- --dry-run     # shows what would be created, writes nothing
pnpm content:import                  # imports
```

What the import does:

- Creates the profile, hero, about, contact, site and SEO records, the project categories and projects, social links, section settings and navigation.
- Copies the hero video, poster, portrait and social image into the media library.
- Imports text you approved as published. Text still marked "awaiting approval" is saved as a **draft** (profile, hero, SEO) so you can review it in the CMS, or listed in the report when it belongs to a list item (project descriptions).
- Never overwrites: anything that already exists is skipped, so running it twice is safe.
- Skips everything marked missing or excluded, and never reads the project sheet, credentials or any résumé.
- Writes `content/import-report.md` listing what was created, skipped, pending your approval and still missing.

## Backups

Back up the database (`mysqldump --single-transaction --default-character-set=utf8mb4 portfolio > portfolio.sql`) and the media folder (`apps/api/uploads`, or your S3 bucket) together. They belong to each other: the database stores the file names.

## Resetting a development database

Only ever on a database that holds nothing you want to keep:

```sql
DROP DATABASE portfolio; -- destroys all content in it
```

then repeat steps 1, 3 and 4.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Access denied for user` | Wrong user, password or host in `DATABASE_URL`; the user was created for `localhost` but you connect to `127.0.0.1`. Create both hosts or use one consistently. |
| Arabic shows as `????` | The database or connection is not `utf8mb4`. Recreate the database with the SQL above. |
| `Can't reach database server` | MySQL is not running, or the port differs. The API keeps running and `/api/v1/health` reports `database: "down"`. |
| Migration says a table exists | The database is not empty. Use a fresh database, or baseline it with `prisma migrate resolve --applied 20261017000000_init` if the tables already match. |

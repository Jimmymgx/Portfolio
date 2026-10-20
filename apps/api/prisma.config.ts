import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// The Prisma CLI does not read .env files by itself, so load the same file the API uses
// (apps/api/.env or the repository root .env). Real environment variables always win.
for (const candidate of [".env", "../../.env"]) {
  const file = path.resolve(process.cwd(), candidate);
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

// Used by the Prisma CLI only; the running API connects through the MariaDB driver adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});

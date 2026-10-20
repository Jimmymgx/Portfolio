import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

/**
 * Prisma 7 talks to MySQL through the MariaDB driver adapter, so no native query-engine binary is needed.
 * The connection is opened lazily on the first query.
 */
function createClient() {
  const url = new URL(env.DATABASE_URL.replace(/^mariadb:/, "mysql:"));
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: Number(url.searchParams.get("connection_limit") ?? 10),
    connectTimeout: 5_000,
    acquireTimeout: 8_000,
    // Arabic text needs a full utf8mb4 connection.
    charset: "utf8mb4",
    ...(url.searchParams.get("ssl") === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { __prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.__prisma ?? createClient();
if (env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;

export type Db = typeof prisma;
/** Transaction client passed to callbacks of `prisma.$transaction`. */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

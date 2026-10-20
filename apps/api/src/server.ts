import { createApp } from "./app.js";
import { logger } from "./common/logger.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";
import { purgeOldSessions } from "./modules/auth/session.js";

const app = createApp();
const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT, env: env.NODE_ENV }, `API listening on ${env.API_PUBLIC_URL}`);
  logger.info(`API docs: ${env.API_PUBLIC_URL}/api/docs`);
});

// Housekeeping: drop long-expired sessions every six hours.
const purge = setInterval(() => void purgeOldSessions().catch((err) => logger.warn({ err }, "Session purge failed")), 6 * 60 * 60 * 1000);
purge.unref();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  clearInterval(purge);
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "Unhandled rejection"));

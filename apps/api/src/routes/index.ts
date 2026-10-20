import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { envelope, registry } from "../config/swagger.js";
import { ok } from "../common/responses/response.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { publicRouter } from "../modules/public/public.routes.js";
import { adminRouter } from "./admin.routes.js";

export const apiRouter = Router();

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Service and database health",
  responses: {
    200: { description: "Healthy", content: { "application/json": { schema: envelope(z.object({ status: z.literal("ok"), database: z.enum(["up", "down"]) })) } } },
  },
});

apiRouter.get("/health", async (_req, res) => {
  let database: "up" | "down" = "up";
  try {
    // Bounded wait so a dead database cannot hang the health endpoint.
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3_000)),
    ]);
  } catch {
    database = "down";
  }
  return ok(res, { status: "ok" as const, database }, database === "up" ? "Healthy" : "Database unavailable");
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/public", publicRouter);
apiRouter.use("/admin", adminRouter);

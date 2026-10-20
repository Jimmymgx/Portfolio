import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { logger } from "./common/logger.js";
import { corsOptions } from "./config/cors.js";
import { env, isProduction, isTest } from "./config/env.js";
import { buildOpenApiDocument } from "./config/swagger.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { viewer } from "./middlewares/authorize.middleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rate-limit.middleware.js";
import { mediaFilesRouter } from "./modules/media/media.routes.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  if (!isTest) {
    app.use(
      pinoHttp({
        logger,
        // Request bodies and cookies are never logged; the logger also redacts them.
        serializers: { req: (req) => ({ id: req.id, method: req.method, url: req.url }), res: (res) => ({ statusCode: res.statusCode }) },
        autoLogging: { ignore: (req) => req.url === "/api/v1/health" },
      }),
    );
  }

  // The interactive docs need inline scripts and styles, so they get a dedicated policy.
  const docsHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  });
  const apiHelmet = helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } });
  app.use((req, res, next) => (req.path.startsWith("/api/docs") ? docsHelmet(req, res, next) : apiHelmet(req, res, next)));

  app.use(cors(corsOptions));
  app.use(apiLimiter);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  // Swagger UI. In production the docs are visible only to signed-in administrators.
  const docsGuard = isProduction ? [authenticate, viewer] : [];
  app.get("/api/docs.json", ...docsGuard, (_req, res) => res.json(buildOpenApiDocument()));
  app.use(
    "/api/docs",
    ...docsGuard,
    swaggerUi.serve,
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
      swaggerUi.setup(buildOpenApiDocument(), { customSiteTitle: "Portfolio API docs", swaggerOptions: { persistAuthorization: true } })(req, res, next),
  );

  const files = mediaFilesRouter();
  if (files) app.use("/media", files);

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

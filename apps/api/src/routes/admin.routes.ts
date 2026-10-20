import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { csrfProtection } from "../middlewares/csrf.middleware.js";
import { auditLogsRouter } from "../modules/audit-logs/audit-logs.routes.js";
import { achievementsRouter, certificationsRouter, educationRouter, experienceRouter } from "../modules/career/career.module.js";
import { mediaRouter } from "../modules/media/media.routes.js";
import { messagesRouter } from "../modules/messages/messages.module.js";
import { navigationRouter, sectionsRouter } from "../modules/navigation/structure.module.js";
import { aboutRouter, contactRouter, heroRouter, profileRouter, seoRouter, siteRouter } from "../modules/profile/singletons.module.js";
import { projectCategoriesRouter, projectFeaturesRouter, projectMediaRouter, projectsRouter } from "../modules/projects/projects.module.js";
import { dashboardRouter } from "../modules/settings/dashboard.routes.js";
import { skillCategoriesRouter, skillsRouter } from "../modules/skills/skills.module.js";
import { aboutFactsRouter, socialLinksRouter } from "../modules/social-links/links.module.js";
import { usersRouter } from "../modules/users/users.module.js";

/**
 * Everything under /api/v1/admin requires a valid session and, for writes, the CSRF token.
 * Role checks (VIEWER / EDITOR / SUPER_ADMIN) are applied per route.
 */
export const adminRouter = Router();

adminRouter.use(authenticate, csrfProtection);

adminRouter.use(dashboardRouter); // /dashboard, /preview-token, /revalidate
adminRouter.use("/profile", profileRouter);
adminRouter.use("/hero", heroRouter);
adminRouter.use("/about", aboutRouter);
adminRouter.use("/about-facts", aboutFactsRouter);
adminRouter.use("/skill-categories", skillCategoriesRouter);
adminRouter.use("/skills", skillsRouter);
adminRouter.use("/project-categories", projectCategoriesRouter);
adminRouter.use("/projects", projectsRouter);
adminRouter.use("/project-features", projectFeaturesRouter);
adminRouter.use("/project-media", projectMediaRouter);
adminRouter.use("/experience", experienceRouter);
adminRouter.use("/education", educationRouter);
adminRouter.use("/certifications", certificationsRouter);
adminRouter.use("/achievements", achievementsRouter);
adminRouter.use("/contact", contactRouter);
adminRouter.use("/social-links", socialLinksRouter);
adminRouter.use("/navigation", navigationRouter);
adminRouter.use("/sections", sectionsRouter);
adminRouter.use("/media", mediaRouter);
adminRouter.use("/seo", seoRouter);
adminRouter.use("/settings", siteRouter);
adminRouter.use("/messages", messagesRouter);
adminRouter.use("/users", usersRouter);
adminRouter.use("/audit-logs", auditLogsRouter);

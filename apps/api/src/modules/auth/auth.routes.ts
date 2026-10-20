import { Router } from "express";
import { z } from "zod";
import { jsonBody, jsonOk, readSecurity, writeSecurity } from "../../common/openapi.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { changePasswordBody, loginBody } from "@portfolio/validation";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { csrfProtection } from "../../middlewares/csrf.middleware.js";
import { loginLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();

const userDoc = z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.enum(["SUPER_ADMIN", "EDITOR", "VIEWER"]), status: z.enum(["ACTIVE", "DISABLED"]), lastLoginAt: z.string().nullable() });
const sessionDoc = z.object({ user: userDoc, csrfToken: z.string().describe("Send this in the X-CSRF-Token header on every write request.") });

registry.registerPath({ method: "post", path: "/auth/login", tags: ["Auth"], summary: "Sign in", description: "Sets an HttpOnly session cookie. Limited to 10 attempts per 15 minutes per IP and email.", request: { body: jsonBody(loginBody) }, responses: { 200: jsonOk("Signed in", sessionDoc), 400: errorResponses[400], 401: errorResponses[401], 429: errorResponses[429] } });
registry.registerPath({ method: "post", path: "/auth/logout", tags: ["Auth"], summary: "Sign out", description: "Revokes the current session.", security: writeSecurity, responses: { 200: jsonOk("Signed out", z.null()), 401: errorResponses[401], 403: errorResponses[403] } });
registry.registerPath({ method: "get", path: "/auth/me", tags: ["Auth"], summary: "Current user and CSRF token", security: readSecurity, responses: { 200: jsonOk("Current user", sessionDoc), 401: errorResponses[401] } });
registry.registerPath({ method: "post", path: "/auth/change-password", tags: ["Auth"], summary: "Change your password", description: "Signs out every other session.", security: writeSecurity, request: { body: jsonBody(changePasswordBody) }, responses: { 200: jsonOk("Password updated", z.null()), 400: errorResponses[400], 401: errorResponses[401] } });

authRouter.post("/login", loginLimiter, validate({ body: loginBody }), authController.login);
authRouter.post("/logout", authenticate, csrfProtection, authController.logout);
authRouter.get("/me", authenticate, authController.me);
authRouter.post("/change-password", authenticate, csrfProtection, validate({ body: changePasswordBody }), authController.changePassword);

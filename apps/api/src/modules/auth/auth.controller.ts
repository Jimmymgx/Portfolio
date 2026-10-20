import type { Request, Response } from "express";
import type { ChangePasswordBody, LoginBody } from "@portfolio/validation";
import { ok } from "../../common/responses/response.js";
import { authService } from "./auth.service.js";
import { clearSessionCookie, setSessionCookie } from "./session.js";

export const authController = {
  async login(req: Request, res: Response) {
    const body = req.body as LoginBody;
    const { token, user, csrfToken } = await authService.login(body.email, body.password, req.get("user-agent"));
    setSessionCookie(res, token);
    return ok(res, { user, csrfToken }, "Signed in");
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.auth!);
    clearSessionCookie(res);
    return ok(res, null, "Signed out");
  },

  async me(req: Request, res: Response) {
    return ok(res, await authService.me(req.auth!.userId, req.auth!.sessionToken));
  },

  async changePassword(req: Request, res: Response) {
    const body = req.body as ChangePasswordBody;
    await authService.changePassword(req.auth!, body.currentPassword, body.newPassword);
    return ok(res, null, "Password updated. Other sessions were signed out");
  },
};

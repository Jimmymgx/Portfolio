import type { AdminRole } from "@portfolio/validation";

declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      email: string;
      name: string;
      role: AdminRole;
      sessionId: string;
      /** Raw session token from the cookie. Used only to derive the CSRF token. */
      sessionToken: string;
    }
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};

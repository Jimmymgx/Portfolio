import pino from "pino";
import { env } from "../config/env.js";

/** Structured logger. Secrets and personal message content are redacted before they reach the output. */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.currentPassword",
      "*.newPassword",
      "*.passwordHash",
      "*.token",
      "*.message",
    ],
    censor: "[redacted]",
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      // Never reaches a real database: tests mock the Prisma client.
      DATABASE_URL: "mysql://test:test@127.0.0.1:3306/portfolio_test",
      SESSION_SECRET: "test-secret-test-secret-test-secret-123456",
      API_PUBLIC_URL: "http://localhost:4000",
      PUBLIC_WEB_URL: "http://localhost:3000",
      ADMIN_WEB_URL: "http://localhost:3001",
      IP_HASH_SALT: "test-ip-salt-123",
    },
  },
});

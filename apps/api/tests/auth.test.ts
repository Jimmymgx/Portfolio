import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory stand-in for Prisma. No test ever reaches a real database.
const db = vi.hoisted(() => {
  const state = {
    users: new Map<string, Record<string, unknown>>(),
    sessions: new Map<string, Record<string, unknown>>(),
    audits: [] as Record<string, unknown>[],
  };
  const byEmail = (email: string) => [...state.users.values()].find((u) => u.email === email) ?? null;
  const prisma = {
    $queryRaw: vi.fn(async () => [{ 1: 1 }]),
    adminUser: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) =>
        where.id ? (state.users.get(where.id) ?? null) : byEmail(where.email!),
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const u = { ...state.users.get(where.id)!, ...data };
        state.users.set(where.id, u);
        return u;
      }),
    },
    adminSession: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const s = { id: `s${state.sessions.size + 1}`, revokedAt: null, ...data };
        state.sessions.set(String(data.tokenHash), s);
        return s;
      }),
      findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) => {
        const s = state.sessions.get(where.tokenHash);
        return s ? { ...s, user: state.users.get(String(s.userId)) } : null;
      }),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async ({ where }: { where: { id?: string } }) => {
        for (const s of state.sessions.values()) if (!where.id || s.id === where.id) s.revokedAt = new Date();
        return { count: 1 };
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data);
        return data;
      }),
    },
  };
  return { state, prisma };
});

vi.mock("../src/config/database.js", () => ({ prisma: db.prisma }));

const { createApp } = await import("../src/app.js");
const { hashPassword } = await import("../src/common/utils/crypto.js");

const PASSWORD = "Correct-Horse-Battery-9";
const app = createApp();

beforeAll(async () => {
  db.state.users.set("u1", {
    id: "u1",
    name: "Test Admin",
    email: "admin@example.test",
    passwordHash: await hashPassword(PASSWORD),
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}, 20_000);

beforeEach(() => {
  db.state.sessions.clear();
  db.state.audits.length = 0;
});

async function signIn() {
  const res = await request(app).post("/api/v1/auth/login").send({ email: "admin@example.test", password: PASSWORD });
  const cookie = (res.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
  return { res, cookie, csrf: res.body.data.csrfToken as string };
}

describe("health", () => {
  it("reports ok and the database state in the standard envelope", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "ok", database: "up" }, meta: null });
  });

  it("reports the database as down without failing", async () => {
    db.prisma.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe("down");
  });
});

describe("error envelope", () => {
  it("returns 404 in the error format for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: "NOT_FOUND", details: [] } });
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await request(app).post("/api/v1/auth/login").set("Content-Type", "application/json").send("{ bad");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("authentication", () => {
  it("rejects unauthenticated access with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("validates the login body", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "not-an-email", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it("gives the same answer for a wrong password and an unknown account", async () => {
    const wrong = await request(app).post("/api/v1/auth/login").send({ email: "admin@example.test", password: "Wrong-Password-123" });
    const unknown = await request(app).post("/api/v1/auth/login").send({ email: "ghost@example.test", password: "Wrong-Password-123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it("signs in with an HttpOnly cookie and never exposes the password hash", async () => {
    const { res } = await signIn();
    expect(res.status).toBe(200);
    const cookie = (res.headers["set-cookie"] as unknown as string[])[0]!;
    expect(cookie).toMatch(/pf_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    expect(res.body.data.user.email).toBe("admin@example.test");
  });

  it("stores only a hash of the session token", async () => {
    const { cookie } = await signIn();
    const token = cookie.split("=")[1]!;
    const stored = [...db.state.sessions.keys()][0]!;
    expect(stored).not.toContain(token);
    expect(stored).toHaveLength(64);
  });

  it("returns the current user for a valid session", async () => {
    const { cookie } = await signIn();
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("SUPER_ADMIN");
  });

  it("requires the CSRF token for state-changing requests", async () => {
    const { cookie, csrf } = await signIn();
    const missing = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe("CSRF_FAILED");

    const wrong = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie).set("X-CSRF-Token", "x".repeat(43));
    expect(wrong.status).toBe(403);

    const good = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie).set("X-CSRF-Token", csrf);
    expect(good.status).toBe(200);
  });

  it("rejects requests from a foreign origin", async () => {
    const { cookie, csrf } = await signIn();
    const res = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie).set("X-CSRF-Token", csrf).set("Origin", "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("revokes the session on logout", async () => {
    const { cookie, csrf } = await signIn();
    await request(app).post("/api/v1/auth/logout").set("Cookie", cookie).set("X-CSRF-Token", csrf);
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });

  it("records sign-ins in the audit log without secrets", async () => {
    await signIn();
    expect(db.state.audits.some((a) => a.action === "auth.login")).toBe(true);
    expect(JSON.stringify(db.state.audits)).not.toContain(PASSWORD);
  });
});

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, PASSWORD } from "./helpers.js";

const g = globalThis as unknown as { __db: ReturnType<typeof createFakeDb> };
vi.mock("../src/config/database.js", async () => {
  const { createFakeDb } = await import("./helpers.js");
  g.__db = createFakeDb();
  return { prisma: g.__db.prisma };
});

const { createApp } = await import("../src/app.js");
const { hashPassword } = await import("../src/common/utils/crypto.js");

const app = createApp();
const db = () => g.__db;

type Role = "SUPER_ADMIN" | "EDITOR" | "VIEWER";

/** A signed-in client that sends the cookie and CSRF token like the dashboard does. */
async function login(role: Role) {
  const email = `${role.toLowerCase()}@example.test`;
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD });
  const cookie = (res.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
  const csrf = res.body.data.csrfToken as string;
  const c = {
    get: (url: string) => request(app).get(`/api/v1${url}`).set("Cookie", cookie),
    post: (url: string, body?: object) => request(app).post(`/api/v1${url}`).set("Cookie", cookie).set("X-CSRF-Token", csrf).send(body),
    patch: (url: string, body: object) => request(app).patch(`/api/v1${url}`).set("Cookie", cookie).set("X-CSRF-Token", csrf).send(body),
    del: (url: string) => request(app).delete(`/api/v1${url}`).set("Cookie", cookie).set("X-CSRF-Token", csrf),
  };
  return c;
}

beforeAll(async () => {
  const hash = await hashPassword(PASSWORD);
  for (const role of ["SUPER_ADMIN", "EDITOR", "VIEWER"] as Role[]) {
    db().state.users.set(`id-${role}`, {
      id: `id-${role}`,
      name: role,
      email: `${role.toLowerCase()}@example.test`,
      passwordHash: hash,
      role,
      status: "ACTIVE",
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}, 30_000);

beforeEach(() => {
  db().state.sessions.clear();
  db().state.audits.length = 0;
  db().state.tables.clear();
  db().state.seq.clear();
});

describe("OpenAPI document", () => {
  it("is generated from the real routes and covers the main modules", async () => {
    const res = await request(app).get("/api/docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\.1/);
    const paths = Object.keys(res.body.paths);
    for (const p of ["/auth/login", "/public/portfolio", "/admin/projects", "/admin/projects/{id}/publish", "/admin/media", "/admin/profile/publish", "/admin/users", "/admin/audit-logs", "/admin/seo/{pageKey}"]) {
      expect(paths).toContain(p);
    }
    expect(paths.length).toBeGreaterThan(80);
    expect(res.body.components.securitySchemes.csrfToken.name).toBe("X-CSRF-Token");
  });

  it("serves the interactive docs page", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});

describe("authorization", () => {
  it("blocks every admin route without a session", async () => {
    for (const url of ["/admin/skills", "/admin/projects", "/admin/profile", "/admin/media", "/admin/users", "/admin/messages", "/admin/dashboard"]) {
      const res = await request(app).get(`/api/v1${url}`);
      expect(res.status, url).toBe(401);
    }
  });

  it("lets a viewer read but not write", async () => {
    const v = await login("VIEWER");
    expect((await v.get("/admin/skills")).status).toBe(200);
    const write = await v.post("/admin/skill-categories", { name: "Languages" });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe("FORBIDDEN");
    expect((await v.patch("/admin/profile", { fullName: "X" })).status).toBe(403);
    expect((await v.post("/admin/profile/publish")).status).toBe(403);
  });

  it("lets an editor write content but not manage users or read audit logs", async () => {
    const e = await login("EDITOR");
    expect((await e.post("/admin/skill-categories", { name: "Languages" })).status).toBe(201);
    expect((await e.get("/admin/users")).status).toBe(403);
    expect((await e.get("/admin/audit-logs")).status).toBe(403);
    expect((await e.del("/admin/messages/abc1234567890")).status).toBe(403);
  });

  it("lets a super admin manage users and read the audit log", async () => {
    const s = await login("SUPER_ADMIN");
    expect((await s.get("/admin/users")).status).toBe(200);
    expect((await s.get("/admin/audit-logs")).status).toBe(200);
  });
});

describe("validation", () => {
  it("rejects bad bodies with field-level details", async () => {
    const e = await login("EDITOR");
    const res = await e.post("/admin/skills", { name: "", symbol: "TOOLONG", categoryId: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["name", "symbol", "categoryId"]));
  });

  it("rejects non-http URLs and unknown fields are stripped", async () => {
    const e = await login("EDITOR");
    const bad = await e.post("/admin/social-links", { platform: "GITHUB", label: "GitHub", url: "javascript:alert(1)" });
    expect(bad.status).toBe(400);
    const ok = await e.post("/admin/social-links", { platform: "GITHUB", label: "GitHub", url: "https://github.com/x", isAdmin: true });
    expect(ok.status).toBe(201);
    expect(ok.body.data.isAdmin).toBeUndefined();
  });

  it("validates ids and pagination", async () => {
    const v = await login("VIEWER");
    expect((await v.get("/admin/skills/abc")).status).toBe(400);
    expect((await v.get("/admin/skills?page=0")).status).toBe(400);
    expect((await v.get("/admin/skills?pageSize=500")).status).toBe(400);
  });
});

describe("collections: create, publish, reorder, delete", () => {
  it("creates drafts, appends at the end, and generates unique slugs", async () => {
    const e = await login("EDITOR");
    const a = await e.post("/admin/skill-categories", { name: "Frontend" });
    const b = await e.post("/admin/skill-categories", { name: "Frontend" });
    expect(a.body.data).toMatchObject({ status: "DRAFT", slug: "frontend", sortOrder: 0 });
    expect(b.body.data).toMatchObject({ slug: "frontend-2", sortOrder: 1 });
    expect(a.body.meta).toBeNull();
  });

  it("returns paginated lists with meta", async () => {
    const e = await login("EDITOR");
    for (const name of ["A", "B", "C"]) await e.post("/admin/skill-categories", { name });
    const res = await e.get("/admin/skill-categories?pageSize=2&page=2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });

  it("publishes and unpublishes, and records both in the audit log", async () => {
    const e = await login("EDITOR");
    const created = await e.post("/admin/social-links", { platform: "GITHUB", label: "GitHub", url: "https://github.com/x" });
    const id = created.body.data.id;
    const pub = await e.post(`/admin/social-links/${id}/publish`);
    expect(pub.body.data.status).toBe("PUBLISHED");
    const unpub = await e.post(`/admin/social-links/${id}/unpublish`);
    expect(unpub.body.data.status).toBe("UNPUBLISHED");
    const actions = db().state.audits.map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["social_link.published", "social_link.unpublished"]));
  });

  it("can publish every publishable collection (regression: skills were missed once)", async () => {
    const e = await login("EDITOR");
    const cat = await e.post("/admin/skill-categories", { name: "Languages" });
    expect((await e.post(`/admin/skill-categories/${cat.body.data.id}/publish`)).body.data.status).toBe("PUBLISHED");
    const skill = await e.post("/admin/skills", { name: "TypeScript", symbol: "Ts", categoryId: cat.body.data.id });
    expect((await e.post(`/admin/skills/${skill.body.data.id}/publish`)).body.data.status).toBe("PUBLISHED");
    const exp = await e.post("/admin/experience", { organization: "A", position: "B", startDate: "2022-01-01", isCurrent: true });
    expect((await e.post(`/admin/experience/${exp.body.data.id}/publish`)).body.data.status).toBe("PUBLISHED");
    const edu = await e.post("/admin/education", { institution: "A", qualification: "B" });
    expect((await e.post(`/admin/education/${edu.body.data.id}/publish`)).body.data.status).toBe("PUBLISHED");
    const cert = await e.post("/admin/certifications", { title: "A", issuer: "B" });
    expect((await e.post(`/admin/certifications/${cert.body.data.id}/publish`)).body.data.status).toBe("PUBLISHED");
    const ach = await e.post("/admin/achievements", { title: "A" });
    expect((await e.post(`/admin/achievements/${ach.body.data.id}/publish`)).body.data.status).toBe("PUBLISHED");
    const fact = await e.post("/admin/about-facts", { label: "A", value: "B" });
    expect((await e.post(`/admin/about-facts/${fact.body.data.id}/publish`)).body.data.status).toBe("PUBLISHED");
  });

  it("returns 404 for missing records and 204 for deletes", async () => {
    const e = await login("EDITOR");
    expect((await e.get("/admin/social-links/999")).status).toBe(404);
    const created = await e.post("/admin/social-links", { platform: "GITHUB", label: "GitHub", url: "https://github.com/x" });
    expect((await e.del(`/admin/social-links/${created.body.data.id}`)).status).toBe(204);
    expect((await e.get(`/admin/social-links/${created.body.data.id}`)).status).toBe(404);
  });

  it("never stores field values in audit metadata, only field names", async () => {
    const e = await login("EDITOR");
    const created = await e.post("/admin/social-links", { platform: "GITHUB", label: "GitHub", url: "https://github.com/x" });
    await e.patch(`/admin/social-links/${created.body.data.id}`, { label: "Secret label value" });
    expect(JSON.stringify(db().state.audits)).not.toContain("Secret label value");
  });
});

describe("singletons: draft and publish", () => {
  const profile = { fullName: "Test Person", displayName: "Test Person", firstName: "Test", initials: "TP", professionalTitle: "Developer" };

  it("keeps edits private until published", async () => {
    const e = await login("EDITOR");
    const saved = await e.patch("/admin/profile", profile);
    expect(saved.status).toBe(200);
    expect(saved.body.data.draft.fullName).toBe("Test Person");
    expect(saved.body.data.published).toBeNull();
    expect(saved.body.data.hasUnpublishedChanges).toBe(true);

    // The public API must not show it yet.
    const before = await request(app).get("/api/v1/public/profile");
    expect(before.body.data).toBeNull();

    await e.post("/admin/profile/publish");
    const after = await request(app).get("/api/v1/public/profile");
    expect(after.body.data.fullName).toBe("Test Person");
  });

  it("does not leak later draft edits to the public site", async () => {
    const e = await login("EDITOR");
    await e.patch("/admin/profile", profile);
    await e.post("/admin/profile/publish");
    const edit = await e.patch("/admin/profile", { professionalTitle: "Changed Title" });
    expect(edit.body.data.hasUnpublishedChanges).toBe(true);
    const publicNow = await request(app).get("/api/v1/public/profile");
    expect(publicNow.body.data.professionalTitle).toBe("Developer");
  });

  it("can discard a draft and go back to the live version", async () => {
    const e = await login("EDITOR");
    await e.patch("/admin/profile", profile);
    await e.post("/admin/profile/publish");
    await e.patch("/admin/profile", { professionalTitle: "Changed Title" });
    const res = await e.post("/admin/profile/discard-draft");
    expect(res.body.data.draft).toBeNull();
    expect(res.body.data.published.professionalTitle).toBe("Developer");
  });

  it("refuses a first draft that lacks required fields", async () => {
    const e = await login("EDITOR");
    const res = await e.patch("/admin/profile", { tagline: "Just a tagline" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("refuses to publish when there is no draft", async () => {
    const e = await login("EDITOR");
    expect((await e.post("/admin/hero/publish")).status).toBe(409);
  });

  it("shows drafts only to holders of a valid preview token", async () => {
    const e = await login("EDITOR");
    await e.patch("/admin/profile", profile);
    const token = (await e.post("/admin/preview-token", { locale: "en", path: "/" })).body.data.token;

    const anon = await request(app).get("/api/v1/public/profile");
    expect(anon.body.data).toBeNull();
    const withToken = await request(app).get("/api/v1/public/profile").set("X-Preview-Token", token);
    expect(withToken.body.data.fullName).toBe("Test Person");
    expect(withToken.headers["cache-control"]).toBe("no-store");
    const forged = await request(app).get("/api/v1/public/profile").set("X-Preview-Token", `${token}x`);
    expect(forged.body.data).toBeNull();
  });
});

describe("public API never exposes unpublished content", () => {
  it("filters every collection by PUBLISHED status", async () => {
    vi.clearAllMocks();
    await request(app).get("/api/v1/public/portfolio");
    const calls: [string, ReturnType<typeof vi.fn>][] = [
      ["project", db().prisma.project.findMany],
      ["certification", db().prisma.certification.findMany],
      ["achievement", db().prisma.achievement.findMany],
      ["socialLink", db().prisma.socialLink.findMany],
      ["experience", db().prisma.experience.findMany],
      ["education", db().prisma.education.findMany],
      ["aboutFact", db().prisma.aboutFact.findMany],
      ["skillCategory", db().prisma.skillCategory.findMany],
    ];
    for (const [name, fn] of calls) {
      expect(fn.mock.calls.at(-1)?.[0]?.where, name).toMatchObject({ status: "PUBLISHED" });
    }
  });

  it("uses PUBLISHED singleton rows when not previewing", async () => {
    vi.clearAllMocks();
    await request(app).get("/api/v1/public/portfolio");
    const states = db().prisma.profile.findFirst.mock.calls.map((c: any[]) => c[0].where.state);
    expect(states.length).toBeGreaterThan(0);
    expect(new Set(states)).toEqual(new Set(["PUBLISHED"]));
  });

  it("hides sensitive columns from the public project payload", async () => {
    const res = await request(app).get("/api/v1/public/projects");
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/updatedById|passwordHash|ipHash/);
  });
});

describe("contact form", () => {
  async function enableForm(e: Awaited<ReturnType<typeof login>>) {
    await e.patch("/admin/contact", { enableContactForm: true });
    await e.post("/admin/contact/publish");
  }
  const message = { name: "Visitor", email: "visitor@example.test", message: "Hello, I would like to talk about a project." };

  it("is closed until the owner enables it", async () => {
    const res = await request(app).post("/api/v1/public/contact/messages").send(message);
    expect(res.status).toBe(403);
  });

  it("stores messages with a hashed IP and never the raw address", async () => {
    const e = await login("EDITOR");
    await enableForm(e);
    const res = await request(app).post("/api/v1/public/contact/messages").send(message);
    expect(res.status).toBe(201);
    const stored = [...db().table("contactMessage").values()][0]!;
    expect(stored.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toMatch(/127\.0\.0\.1|::1|::ffff/);
  });

  it("silently drops honeypot submissions and double submits", async () => {
    const e = await login("EDITOR");
    await enableForm(e);
    const bot = await request(app).post("/api/v1/public/contact/messages").send({ ...message, website: "http://spam.example" });
    expect(bot.status).toBe(400); // honeypot field must stay empty: schema rejects a filled value
    await request(app).post("/api/v1/public/contact/messages").send(message);
    await request(app).post("/api/v1/public/contact/messages").send(message);
    expect(db().table("contactMessage").size).toBe(1);
  });

  it("validates the message", async () => {
    const e = await login("EDITOR");
    await enableForm(e);
    const res = await request(app).post("/api/v1/public/contact/messages").send({ name: "", email: "nope", message: "short" });
    expect(res.status).toBe(400);
  });
});

describe("users", () => {
  it("rejects weak passwords", async () => {
    const s = await login("SUPER_ADMIN");
    const res = await s.post("/admin/users", { name: "New", email: "new@example.test", password: "short", role: "EDITOR" });
    expect(res.status).toBe(400);
  });

  it("never returns password hashes", async () => {
    const s = await login("SUPER_ADMIN");
    const res = await s.post("/admin/users", { name: "New", email: "new@example.test", password: "Another-Strong-Pass-1", role: "EDITOR" });
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
  });

  it("stops administrators from changing their own role", async () => {
    const s = await login("SUPER_ADMIN");
    const res = await s.patch("/admin/users/id-SUPER_ADMIN", { role: "VIEWER" });
    expect(res.status).toBe(409);
  });

  it("protects the last active super administrator", async () => {
    const s = await login("SUPER_ADMIN");
    const res = await s.del("/admin/users/id-SUPER_ADMIN");
    expect(res.status).toBe(409);
  });
});

describe("sections", () => {
  async function seedSections() {
    for (const [i, key] of ["HERO", "ABOUT", "WORK", "CONTACT"].entries()) {
      await db().prisma.sectionSetting.create({ data: { sectionKey: key, displayName: key, isEnabled: true, sortOrder: i } });
    }
  }

  it("keeps the hero first", async () => {
    await seedSections();
    const e = await login("EDITOR");
    const res = await e.post("/admin/sections/reorder", { keys: ["ABOUT", "HERO", "WORK", "CONTACT"] });
    expect(res.status).toBe(400);
  });

  it("requires every section exactly once", async () => {
    await seedSections();
    const e = await login("EDITOR");
    const res = await e.post("/admin/sections/reorder", { keys: ["HERO", "ABOUT"] });
    expect(res.status).toBe(400);
  });

  it("only accepts known configuration keys", async () => {
    await seedSections();
    const e = await login("EDITOR");
    const res = await e.patch("/admin/sections/ABOUT", { configuration: { runCode: "alert(1)" } });
    expect(res.status).toBe(400);
  });
});

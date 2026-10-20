import { vi } from "vitest";

/**
 * In-memory stand-in for Prisma, shared by the API tests. No test reaches a real database.
 * Models are generic tables keyed by id; only the operations the code under test uses are implemented.
 */
export function createFakeDb() {
  const state = {
    users: new Map<string, Record<string, any>>(),
    sessions: new Map<string, Record<string, any>>(),
    audits: [] as Record<string, any>[],
    tables: new Map<string, Map<number, Record<string, any>>>(),
    seq: new Map<string, number>(),
  };

  const table = (name: string) => {
    if (!state.tables.has(name)) state.tables.set(name, new Map());
    return state.tables.get(name)!;
  };

  const matches = (row: Record<string, any>, where: Record<string, any> = {}): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (k === "AND") return (v as any[]).every((w) => matches(row, w));
      if (k === "OR") return (v as any[]).some((w) => matches(row, w));
      if (k === "NOT") return !matches(row, v);
      if (v && typeof v === "object" && !(v instanceof Date)) {
        if ("in" in v) return v.in.includes(row[k]);
        if ("notIn" in v) return !v.notIn.includes(row[k]);
        if ("not" in v) return row[k] !== v.not;
        if ("contains" in v) return String(row[k] ?? "").toLowerCase().includes(String(v.contains).toLowerCase());
        if ("gt" in v) return row[k] > v.gt;
        return true;
      }
      return row[k] === v;
    });

  /** The fake has no relations: fill included relation keys with empty values so mappers can run. */
  const ARRAY_RELATIONS = new Set(["skills", "projects", "features", "media"]);
  const withIncludes = (row: Record<string, any> | null, include?: Record<string, any>) => {
    if (!row) return row;
    const out = { ...row };
    for (const key of Object.keys(include ?? {})) if (!(key in out)) out[key] = ARRAY_RELATIONS.has(key) ? [] : null;
    return out;
  };

  const delegate = (name: string, defaults: () => Record<string, any> = () => ({})) => ({
    findMany: vi.fn(async (args: any = {}) => {
      let rows = [...table(name).values()].filter((r) => matches(r, args.where));
      const order = Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : [];
      for (const o of [...order].reverse()) {
        const [[k, dir]] = Object.entries(o) as [string, string][];
        rows = rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (dir === "desc" ? -1 : 1));
      }
      if (args.skip) rows = rows.slice(args.skip);
      if (args.take) rows = rows.slice(0, args.take);
      return rows.map((r) => withIncludes(r, args.include)!);
    }),
    findFirst: vi.fn(async (args: any = {}) => withIncludes([...table(name).values()].find((r) => matches(r, args.where)) ?? null, args.include)),
    findUnique: vi.fn(async (args: any) => withIncludes([...table(name).values()].find((r) => matches(r, args.where)) ?? null, args.include)),
    count: vi.fn(async (args: any = {}) => [...table(name).values()].filter((r) => matches(r, args.where)).length),
    create: vi.fn(async ({ data, include }: any) => {
      const id = (state.seq.get(name) ?? 0) + 1;
      state.seq.set(name, id);
      const row = { id, createdAt: new Date(), updatedAt: new Date(), ...defaults(), ...data };
      table(name).set(id, row);
      return withIncludes(row, include);
    }),
    update: vi.fn(async ({ where, data, include }: any) => {
      const row = [...table(name).values()].find((r) => matches(r, where));
      if (!row) throw Object.assign(new Error("not found"), { code: "P2025" });
      Object.assign(row, data, { updatedAt: new Date() });
      return withIncludes(row, include);
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      const rows = [...table(name).values()].filter((r) => matches(r, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    }),
    delete: vi.fn(async ({ where }: any) => {
      const row = [...table(name).values()].find((r) => matches(r, where));
      if (!row) throw Object.assign(new Error("not found"), { code: "P2025" });
      table(name).delete(row.id);
      return row;
    }),
    aggregate: vi.fn(async (args: any = {}) => {
      const rows = [...table(name).values()].filter((r) => matches(r, args.where));
      return { _max: { sortOrder: rows.length ? Math.max(...rows.map((r) => r.sortOrder ?? 0)) : null } };
    }),
    upsert: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    createMany: vi.fn(async () => ({ count: 0 })),
  });

  const names = [
    "skillCategory",
    "skill",
    "project",
    "projectCategory",
    "projectFeature",
    "projectMedia",
    "projectSkill",
    "experience",
    "education",
    "certification",
    "achievement",
    "socialLink",
    "aboutFact",
    "navigationItem",
    "sectionSetting",
    "contactMessage",
    "profile",
    "hero",
    "about",
    "contactSettings",
    "siteSettings",
    "seoSettings",
    "media",
  ];

  const prisma: Record<string, any> = Object.fromEntries(names.map((n) => [n, delegate(n)]));

  Object.assign(prisma, {
    $queryRaw: vi.fn(async () => [{ 1: 1 }]),
    adminUser: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.id ? (state.users.get(where.id) ?? null) : ([...state.users.values()].find((u) => u.email === where.email) ?? null),
      ),
      findMany: vi.fn(async () => [...state.users.values()]),
      count: vi.fn(async ({ where = {} }: any = {}) => [...state.users.values()].filter((u) => matches(u, where)).length),
      create: vi.fn(async ({ data }: any) => {
        const u = { id: `u${state.users.size + 1}`, status: "ACTIVE", lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.users.set(u.id, u);
        return u;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const u = { ...state.users.get(where.id)!, ...data };
        state.users.set(where.id, u);
        return u;
      }),
      delete: vi.fn(async ({ where }: any) => state.users.delete(where.id)),
    },
    adminSession: {
      create: vi.fn(async ({ data }: any) => {
        const s = { id: `s${state.sessions.size + 1}`, revokedAt: null, ...data };
        state.sessions.set(String(data.tokenHash), s);
        return s;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const s = state.sessions.get(where.tokenHash);
        return s ? { ...s, user: state.users.get(String(s.userId)) } : null;
      }),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async ({ where }: any) => {
        for (const s of state.sessions.values()) if ((!where.id || s.id === where.id) && (!where.userId || s.userId === where.userId)) s.revokedAt = new Date();
        return { count: 1 };
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `a${state.audits.length + 1}`, createdAt: new Date(), ...data };
        state.audits.push(row);
        return row;
      }),
      findMany: vi.fn(async () => state.audits),
      count: vi.fn(async () => state.audits.length),
    },
  });

  prisma.$transaction = vi.fn(async (arg: any) => (typeof arg === "function" ? arg(prisma) : Promise.all(arg)));

  return { state, prisma, table };
}

export const PASSWORD = "Correct-Horse-Battery-9";

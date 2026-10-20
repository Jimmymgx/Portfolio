import type { AdminUserDto, AreaStatus, DashboardStats, OwnerDto, MediaDto, PageMeta, SectionSettingDto, SessionUserDto, SetupItem, SingletonDto } from "@portfolio/types";
import type { Lang, MessageStatus, SectionKey } from "@portfolio/validation";
import { createHttp, type ClientOptions, type Http } from "./http.js";

/** Admin records carry both languages, so they are loosely typed here and checked by the shared Zod schemas in forms. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = Record<string, any>;
export type ListParams = { page?: number; pageSize?: number; q?: string; sort?: string; order?: "asc" | "desc" } & Record<string, string | number | boolean | undefined>;
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface Resource<T = Rec> {
  list(params?: ListParams): Promise<Page<T>>;
  get(id: number | string): Promise<T>;
  create(body: Rec): Promise<T>;
  update(id: number | string, body: Rec): Promise<T>;
  remove(id: number | string): Promise<void>;
  reorder(ids: number[]): Promise<void>;
  publish(id: number | string): Promise<T>;
  unpublish(id: number | string): Promise<T>;
}

function resource<T = Rec>(http: Http, path: string): Resource<T> {
  return {
    async list(params) {
      const r = await http<T[]>("GET", path, { query: params });
      return { items: r.data, meta: r.meta ?? { page: 1, pageSize: r.data.length, total: r.data.length, totalPages: 1 } };
    },
    get: async (id) => (await http<T>("GET", `${path}/${id}`)).data,
    create: async (body) => (await http<T>("POST", path, { body })).data,
    update: async (id, body) => (await http<T>("PATCH", `${path}/${id}`, { body })).data,
    remove: async (id) => void (await http("DELETE", `${path}/${id}`)),
    reorder: async (ids) => void (await http("POST", `${path}/reorder`, { body: { ids } })),
    publish: async (id) => (await http<T>("POST", `${path}/${id}/publish`)).data,
    unpublish: async (id) => (await http<T>("POST", `${path}/${id}/unpublish`)).data,
  };
}

export interface Singleton {
  get(): Promise<SingletonDto<Rec>>;
  save(patch: Rec): Promise<SingletonDto<Rec>>;
  publish(): Promise<SingletonDto<Rec>>;
  discard(): Promise<SingletonDto<Rec>>;
}

function singleton(http: Http, path: string): Singleton {
  return {
    get: async () => (await http<SingletonDto<Rec>>("GET", path)).data,
    save: async (patch) => (await http<SingletonDto<Rec>>("PATCH", path, { body: patch })).data,
    publish: async () => (await http<SingletonDto<Rec>>("POST", `${path}/publish`)).data,
    discard: async () => (await http<SingletonDto<Rec>>("POST", `${path}/discard-draft`)).data,
  };
}

export function createAdminClient(options: Omit<ClientOptions, "getCsrfToken">) {
  let csrf: string | null = null;
  const http = createHttp({ ...options, credentials: options.credentials ?? "include", getCsrfToken: () => csrf });

  const remember = (s: SessionUserDto) => {
    csrf = s.csrfToken;
    return s;
  };

  return {
    setCsrfToken(token: string | null) {
      csrf = token;
    },

    auth: {
      async login(email: string, password: string) {
        return remember((await http<SessionUserDto>("POST", "/auth/login", { body: { email, password } })).data);
      },
      async logout() {
        await http("POST", "/auth/logout");
        csrf = null;
      },
      async me() {
        return remember((await http<SessionUserDto>("GET", "/auth/me")).data);
      },
      changePassword: async (currentPassword: string, newPassword: string) => void (await http("POST", "/auth/change-password", { body: { currentPassword, newPassword } })),
    },

    owner: async () => (await http<OwnerDto>("GET", "/admin/owner")).data,
    dashboard: async () =>
      (await http<{ stats: DashboardStats; setup: SetupItem[]; areas: AreaStatus[]; lastPublishedAt: string | null; recentProjects: Rec[]; recentMessages: Rec[]; recentActivity: Rec[] }>("GET", "/admin/dashboard")).data,
    previewLink: async (locale: Lang = "en", path = "/") => (await http<{ token: string; url: string; expiresInSeconds: number }>("POST", "/admin/preview-token", { body: { locale, path } })).data,
    refreshWebsite: async () => void (await http("POST", "/admin/revalidate")),

    profile: singleton(http, "/admin/profile"),
    hero: singleton(http, "/admin/hero"),
    about: singleton(http, "/admin/about"),
    contact: singleton(http, "/admin/contact"),
    site: singleton(http, "/admin/settings"),
    seo: (pageKey = "home") => singleton(http, `/admin/seo/${pageKey}`),

    aboutFacts: resource(http, "/admin/about-facts"),
    skillCategories: resource(http, "/admin/skill-categories"),
    skills: resource(http, "/admin/skills"),
    projectCategories: resource(http, "/admin/project-categories"),
    projects: {
      ...resource(http, "/admin/projects"),
      duplicate: async (id: number) => (await http<Rec>("POST", `/admin/projects/${id}/duplicate`)).data,
      setSkills: async (id: number, skillIds: number[]) => (await http<Rec>("PUT", `/admin/projects/${id}/skills`, { body: { skillIds } })).data,
    },
    projectFeatures: resource(http, "/admin/project-features"),
    projectMedia: resource(http, "/admin/project-media"),
    experience: resource(http, "/admin/experience"),
    education: resource(http, "/admin/education"),
    certifications: resource(http, "/admin/certifications"),
    achievements: resource(http, "/admin/achievements"),
    socialLinks: resource(http, "/admin/social-links"),
    navigation: resource(http, "/admin/navigation"),

    sections: {
      list: async () => (await http<SectionSettingDto[]>("GET", "/admin/sections")).data,
      update: async (key: SectionKey, patch: Rec) => (await http<SectionSettingDto>("PATCH", `/admin/sections/${key}`, { body: patch })).data,
      reorder: async (keys: SectionKey[]) => (await http<SectionSettingDto[]>("POST", "/admin/sections/reorder", { body: { keys } })).data,
    },

    media: {
      async list(params?: ListParams & { kind?: string; unused?: boolean }): Promise<Page<MediaDto>> {
        const r = await http<MediaDto[]>("GET", "/admin/media", { query: params });
        return { items: r.data, meta: r.meta! };
      },
      get: async (id: number) => (await http<MediaDto>("GET", `/admin/media/${id}`)).data,
      async upload(file: File | Blob, name?: string) {
        const fd = new FormData();
        fd.append("file", file, name ?? (file as File).name ?? "upload");
        const r = await http<MediaDto>("POST", "/admin/media", { formData: fd });
        return { media: r.data, message: r.message };
      },
      updateMeta: async (id: number, patch: Rec) => (await http<MediaDto>("PATCH", `/admin/media/${id}`, { body: patch })).data,
      async replace(id: number, file: File | Blob) {
        const fd = new FormData();
        fd.append("file", file, (file as File).name ?? "upload");
        return (await http<MediaDto>("PUT", `/admin/media/${id}/file`, { formData: fd })).data;
      },
      remove: async (id: number) => void (await http("DELETE", `/admin/media/${id}`)),
      usage: async (id: number) => (await http<{ usedAs: string; count: number }[]>("GET", `/admin/media/${id}/usage`)).data,
    },

    messages: {
      async list(params?: ListParams & { status?: MessageStatus }): Promise<Page<Rec>> {
        const r = await http<Rec[]>("GET", "/admin/messages", { query: params });
        return { items: r.data, meta: r.meta! };
      },
      get: async (id: string) => (await http<Rec>("GET", `/admin/messages/${id}`)).data,
      setStatus: async (id: string, status: MessageStatus) => (await http<Rec>("PATCH", `/admin/messages/${id}`, { body: { status } })).data,
      remove: async (id: string) => void (await http("DELETE", `/admin/messages/${id}`)),
    },

    users: {
      async list(params?: ListParams & { role?: string; status?: string }): Promise<Page<AdminUserDto>> {
        const r = await http<AdminUserDto[]>("GET", "/admin/users", { query: params });
        return { items: r.data, meta: r.meta! };
      },
      get: async (id: string) => (await http<AdminUserDto>("GET", `/admin/users/${id}`)).data,
      create: async (body: Rec) => (await http<AdminUserDto>("POST", "/admin/users", { body })).data,
      update: async (id: string, body: Rec) => (await http<AdminUserDto>("PATCH", `/admin/users/${id}`, { body })).data,
      resetPassword: async (id: string, newPassword: string) => void (await http("POST", `/admin/users/${id}/reset-password`, { body: { newPassword } })),
      remove: async (id: string) => void (await http("DELETE", `/admin/users/${id}`)),
    },

    async auditLogs(params?: ListParams & { entityType?: string; actorId?: string; action?: string }): Promise<Page<Rec>> {
      const r = await http<Rec[]>("GET", "/admin/audit-logs", { query: params });
      return { items: r.data, meta: r.meta! };
    },
  };
}

export type AdminClient = ReturnType<typeof createAdminClient>;

import type { PublicLang, PublicPortfolio, PublicProject } from "@portfolio/types";
import { createHttp, type ClientOptions, type RequestOptions } from "./http.js";

export interface PublicFetchOptions {
  /** Signed preview token. When present the API returns drafts too and the response is never cached. */
  previewToken?: string | null;
  /** Next.js fetch options (tags, revalidate). Ignored by other runtimes. */
  init?: RequestOptions["init"];
}

/** Read-only client for the public website. Never sends credentials. */
export function createPublicClient(options: Omit<ClientOptions, "credentials" | "getCsrfToken">) {
  const http = createHttp({ ...options, credentials: "omit" });
  const headers = (o?: PublicFetchOptions) => (o?.previewToken ? { "X-Preview-Token": o.previewToken } : undefined);
  const init = (o?: PublicFetchOptions) => (o?.previewToken ? { ...(o.init ?? {}), cache: "no-store" as const } : o?.init);

  return {
    async portfolio(lang: PublicLang, o?: PublicFetchOptions) {
      return (await http<PublicPortfolio>("GET", "/public/portfolio", { query: { lang }, headers: headers(o), init: init(o) })).data;
    },
    async project(lang: PublicLang, slug: string, o?: PublicFetchOptions) {
      return (await http<PublicProject>("GET", `/public/projects/${encodeURIComponent(slug)}`, { query: { lang }, headers: headers(o), init: init(o) })).data;
    },
    async sendMessage(body: { name: string; email: string; subject?: string; message: string; website?: string }) {
      await http("POST", "/public/contact/messages", { body });
    },
    async verifyPreview(token: string) {
      return (await http<{ valid: boolean }>("POST", "/public/preview/verify", { body: { token } })).data.valid;
    },
  };
}

export type PublicClient = ReturnType<typeof createPublicClient>;

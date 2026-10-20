import type { ZodObject } from "zod";
import type { SingletonDto } from "@portfolio/types";
import { prisma } from "../../config/database.js";
import { audit } from "../../modules/audit-logs/audit.service.js";
import { revalidateWebsite } from "../../services/revalidation.service.js";
import { Errors } from "../errors/app-error.js";
import { cleanStrings } from "../utils/text.js";
import type { Actor, DelegateFor } from "./types.js";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Key = Record<string, unknown>;

export interface SingletonConfig {
  entity: string;
  auditType: string;
  delegateFor: DelegateFor;
  /** Full schema of the editable fields. Used to validate the merged draft and to know which columns to publish. */
  fields: ZodObject;
  /** Values for required columns when the very first draft is created without a published copy. */
  defaults?: Record<string, unknown>;
  /** Maps a `...MediaId` column to its Prisma relation name, so previews can be returned with the record. */
  media?: Record<string, string>;
  /** Prisma `include` (the media relations). */
  include?: Record<string, unknown>;
}

const META = new Set(["id", "state", "updatedAt", "updatedById", "pageKey"]);

export class SingletonService {
  constructor(private readonly c: SingletonConfig) {}

  private get d() {
    return this.c.delegateFor(prisma);
  }

  private inc() {
    return this.c.include ? { include: this.c.include } : {};
  }

  private toPlain(row: Row | null) {
    if (!row) return null;
    const out = JSON.parse(JSON.stringify(row)) as Row;
    if (this.c.media) {
      const preview: Record<string, unknown> = {};
      for (const [field, relation] of Object.entries(this.c.media)) {
        const m = out[relation] as { id: number; publicUrl: string; altText: string | null; mimeType: string } | null | undefined;
        preview[field] = m ? { id: m.id, url: m.publicUrl, altText: m.altText, mimeType: m.mimeType } : null;
        delete out[relation];
      }
      out.mediaPreview = preview;
    }
    return out;
  }

  private editable(row: Row): Row {
    const keys = Object.keys(this.c.fields.shape);
    return Object.fromEntries(keys.map((k) => [k, row[k] ?? null]));
  }

  async get(key: Key = {}): Promise<SingletonDto<Record<string, unknown>>> {
    const [draft, published] = await Promise.all([
      this.d.findFirst({ where: { ...key, state: "DRAFT" }, ...this.inc() }),
      this.d.findFirst({ where: { ...key, state: "PUBLISHED" }, ...this.inc() }),
    ]);
    const changed = !!draft && (!published || JSON.stringify(this.editable(draft)) !== JSON.stringify(this.editable(published)));
    const ids = [draft?.updatedById, published?.updatedById].filter(Boolean) as string[];
    const names = ids.length ? new Map((await prisma.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name])) : new Map<string, string>();
    const withEditor = (row: Row | null) => {
      const plain = this.toPlain(row);
      if (plain) plain.updatedByName = names.get(row!.updatedById) ?? null;
      return plain;
    };
    return {
      draft: withEditor(draft) as never,
      published: withEditor(published) as never,
      hasUnpublishedChanges: changed,
    };
  }

  /** Merges a partial update into the draft row, creating the draft from the published copy if needed. */
  async updateDraft(actor: Actor, patch: Row, key: Key = {}) {
    const existingDraft: Row | null = await this.d.findFirst({ where: { ...key, state: "DRAFT" } });
    const published: Row | null = existingDraft ? null : await this.d.findFirst({ where: { ...key, state: "PUBLISHED" } });
    const base = existingDraft ?? published;

    const cleanPatch = cleanStrings(patch);
    const merged = { ...(this.c.defaults ?? {}), ...(base ? this.editable(base) : {}), ...cleanPatch };

    // The merged draft must be complete and valid, even though each PATCH may be partial.
    const parsed = this.c.fields.safeParse(Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v === null ? undefined : v])));
    if (!parsed.success) {
      throw Errors.validation(
        parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        "The draft is missing required fields",
      );
    }

    const data = { ...cleanPatch, updatedById: actor.userId };
    if (existingDraft) {
      await this.d.update({ where: { id: existingDraft.id }, data });
    } else {
      await this.d.create({ data: { ...this.editable(merged), ...cleanPatch, ...key, state: "DRAFT", updatedById: actor.userId } });
    }
    await audit(actor, { action: `${this.c.auditType}.draft_saved`, entityType: this.c.entity, metadata: { fields: Object.keys(patch) } });
    return this.get(key);
  }

  /** Copies the draft over the live row in one transaction. Nothing is public until this runs. */
  async publish(actor: Actor, key: Key = {}) {
    await prisma.$transaction(async (tx) => {
      const d = this.c.delegateFor(tx);
      const draft: Row | null = await d.findFirst({ where: { ...key, state: "DRAFT" } });
      if (!draft) throw Errors.conflict("There is no draft to publish");
      const live: Row | null = await d.findFirst({ where: { ...key, state: "PUBLISHED" } });
      const data = { ...this.editable(draft), updatedById: actor.userId };
      if (live) await d.update({ where: { id: live.id }, data });
      else await d.create({ data: { ...data, ...key, state: "PUBLISHED" } });
    });
    await audit(actor, { action: `${this.c.auditType}.published`, entityType: this.c.entity });
    void revalidateWebsite();
    return this.get(key);
  }

  /** Throws away unpublished edits and goes back to the live version. */
  async discardDraft(actor: Actor, key: Key = {}) {
    const draft: Row | null = await this.d.findFirst({ where: { ...key, state: "DRAFT" } });
    if (draft) await this.d.delete({ where: { id: draft.id } });
    await audit(actor, { action: `${this.c.auditType}.draft_discarded`, entityType: this.c.entity });
    return this.get(key);
  }
}

export { META as SINGLETON_META_KEYS };

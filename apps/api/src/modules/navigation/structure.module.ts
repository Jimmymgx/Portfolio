import {
  listQuery,
  navigationItemCreate,
  navigationItemUpdate,
  sectionKeyParams,
  sectionReorderBody,
  sectionSettingUpdate,
  SECTION_KEYS,
  type SectionKey,
} from "@portfolio/validation";
import type { SectionSettingDto } from "@portfolio/types";
import { Router } from "express";
import { z } from "zod";
import { CollectionController } from "../../common/crud/collection.controller.js";
import { CollectionRepository } from "../../common/crud/collection.repository.js";
import { collectionRouter } from "../../common/crud/collection.routes.js";
import { defineCollection } from "../../common/crud/collection.service.js";
import type { Actor } from "../../common/crud/types.js";
import { Errors } from "../../common/errors/app-error.js";
import { jsonBody, jsonOk, readSecurity, recordSchema, writeSecurity } from "../../common/openapi.js";
import { ok } from "../../common/responses/response.js";
import { plain } from "../../common/utils/serialize.js";
import { cleanStrings } from "../../common/utils/text.js";
import { prisma } from "../../config/database.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { editor, viewer } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { revalidateWebsite } from "../../services/revalidation.service.js";
import { audit } from "../audit-logs/audit.service.js";

/* ───────── navigation links ───────── */

const navService = defineCollection({ create: navigationItemCreate, update: navigationItemUpdate }, {
  entity: "Navigation item",
  auditType: "navigation",
  repo: new CollectionRepository((db) => db.navigationItem, {
    searchFields: ["label", "labelAr"],
    sortable: ["sortOrder", "label"],
    defaultOrder: { field: "sortOrder", order: "asc" },
  }),
  toDto: (row) => plain(row),
  async buildCreate(input, { nextSort }) {
    if (input.sectionKey && (await prisma.navigationItem.findFirst({ where: { sectionKey: input.sectionKey } }))) {
      throw Errors.conflict("This section already has a navigation item");
    }
    return { isVisible: true, ...cleanStrings(input), sortOrder: input.sortOrder ?? nextSort };
  },
  buildUpdate: (input) => cleanStrings(input),
});

export const navigationRouter = collectionRouter({
  controller: new CollectionController(navService, "Navigation item"),
  schemas: { list: listQuery, create: navigationItemCreate, update: navigationItemUpdate },
  docs: { tag: "Navigation & sections", path: "/admin/navigation", singular: "navigation item", plural: "navigation items", record: recordSchema(navigationItemCreate), publishable: false },
});

/* ───────── sections: enable, rename, reorder ───────── */

const toSectionDto = (row: { sectionKey: SectionKey; displayName: string; displayNameAr: string | null; isEnabled: boolean; sortOrder: number; configuration: unknown }): SectionSettingDto => ({
  key: row.sectionKey,
  displayName: row.displayName,
  displayNameAr: row.displayNameAr,
  isEnabled: row.isEnabled,
  sortOrder: row.sortOrder,
  configuration: (row.configuration as SectionSettingDto["configuration"]) ?? null,
});

export const sectionsService = {
  async list() {
    const rows = await prisma.sectionSetting.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
    return rows.map(toSectionDto);
  },

  async update(actor: Actor, key: SectionKey, input: z.infer<typeof sectionSettingUpdate>) {
    const current = await prisma.sectionSetting.findUnique({ where: { sectionKey: key } });
    if (!current) throw Errors.notFound("Section");
    const data: Record<string, unknown> = cleanStrings(input);
    if ("configuration" in input) data.configuration = input.configuration ?? null;
    await prisma.sectionSetting.update({ where: { sectionKey: key }, data });
    await audit(actor, { action: "section.updated", entityType: "SectionSetting", entityId: key, metadata: { fields: Object.keys(input) } });
    void revalidateWebsite();
    return toSectionDto((await prisma.sectionSetting.findUnique({ where: { sectionKey: key } }))!);
  },

  /** Sets the order of all sections. The hero is always the first block of the page, so it cannot be moved. */
  async reorder(actor: Actor, keys: SectionKey[]) {
    const existing = await prisma.sectionSetting.findMany({ select: { sectionKey: true } });
    const have = new Set(existing.map((e) => e.sectionKey));
    if (keys.length !== have.size || keys.some((k) => !have.has(k))) {
      throw Errors.validation([{ path: "keys", message: "List every section exactly once" }]);
    }
    if (have.has("HERO") && keys[0] !== "HERO") {
      throw Errors.validation([{ path: "keys", message: "The hero always stays first" }]);
    }
    await prisma.$transaction(keys.map((k, i) => prisma.sectionSetting.update({ where: { sectionKey: k }, data: { sortOrder: i } })));
    await audit(actor, { action: "section.reordered", entityType: "SectionSetting" });
    void revalidateWebsite();
    return this.list();
  },
};

const sectionDoc = z.object({
  key: z.enum(SECTION_KEYS),
  displayName: z.string(),
  displayNameAr: z.string().nullable(),
  isEnabled: z.boolean(),
  sortOrder: z.number(),
  configuration: z.object({ showNextCard: z.boolean().optional() }).nullable(),
});

registry.registerPath({ method: "get", path: "/admin/sections", tags: ["Navigation & sections"], summary: "List sections in display order", security: readSecurity, responses: { 200: jsonOk("Sections", z.array(sectionDoc)), 401: errorResponses[401] } });
registry.registerPath({ method: "patch", path: "/admin/sections/{key}", tags: ["Navigation & sections"], summary: "Enable, disable or rename a section", description: "Disabling hides the section, its navigation link and its number on the website. Its content is kept.", security: writeSecurity, request: { params: sectionKeyParams, body: jsonBody(sectionSettingUpdate) }, responses: { 200: jsonOk("Updated", sectionDoc), 404: errorResponses[404] } });
registry.registerPath({ method: "post", path: "/admin/sections/reorder", tags: ["Navigation & sections"], summary: "Reorder sections", description: "Send every section key in the new order. The hero must stay first.", security: writeSecurity, request: { body: jsonBody(sectionReorderBody) }, responses: { 200: jsonOk("Reordered", z.array(sectionDoc)), 400: errorResponses[400] } });

export const sectionsRouter = Router();
sectionsRouter.get("/", viewer, async (_req, res) => ok(res, await sectionsService.list()));
sectionsRouter.post("/reorder", editor, validate({ body: sectionReorderBody }), async (req, res) =>
  ok(res, await sectionsService.reorder(req.auth!, (req.body as { keys: SectionKey[] }).keys), "Section order saved"),
);
sectionsRouter.patch("/:key", editor, validate({ params: sectionKeyParams, body: sectionSettingUpdate }), async (req, res) =>
  ok(res, await sectionsService.update(req.auth!, req.params.key as SectionKey, req.body), "Section updated"),
);

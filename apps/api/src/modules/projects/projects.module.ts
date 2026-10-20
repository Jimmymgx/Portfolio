import {
  idParams,
  projectCategoryCreate,
  projectCategoryUpdate,
  projectCreate,
  projectFeatureCreate,
  projectFeatureList,
  projectFeatureUpdate,
  projectList,
  projectMediaCreate,
  projectMediaList,
  projectMediaUpdate,
  projectSkillsReplace,
  projectUpdate,
  listQuery,
} from "@portfolio/validation";
import { z } from "zod";
import { CollectionController } from "../../common/crud/collection.controller.js";
import { CollectionRepository } from "../../common/crud/collection.repository.js";
import { collectionRouter } from "../../common/crud/collection.routes.js";
import { defineCollection } from "../../common/crud/collection.service.js";
import type { Actor } from "../../common/crud/types.js";
import { Errors } from "../../common/errors/app-error.js";
import { jsonBody, jsonOk, recordSchema, writeSecurity, idPathParams } from "../../common/openapi.js";
import { created, ok } from "../../common/responses/response.js";
import { absoluteMediaUrl } from "../../common/storage/storage.js";
import { omit, plain } from "../../common/utils/serialize.js";
import { makeUniqueSlug } from "../../common/utils/slug.js";
import { cleanStrings } from "../../common/utils/text.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { prisma, type Tx } from "../../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { editor } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { revalidateWebsite } from "../../services/revalidation.service.js";
import { audit } from "../audit-logs/audit.service.js";

/* ───────── categories ───────── */

const categoryRepo = new CollectionRepository((db) => db.projectCategory, {
  searchFields: ["name", "nameAr", "slug"],
  sortable: ["name", "sortOrder"],
  defaultOrder: { field: "sortOrder", order: "asc" },
});

const categoryService = defineCollection({ create: projectCategoryCreate, update: projectCategoryUpdate }, {
  entity: "Project category",
  auditType: "project_category",
  repo: categoryRepo,
  toDto: (row) => plain(row),
  async buildCreate(input, { nextSort }) {
    const { slug, ...rest } = cleanStrings(input);
    return { ...rest, slug: await makeUniqueSlug(prisma.projectCategory, input.name, slug), sortOrder: input.sortOrder ?? nextSort };
  },
  buildUpdate: (input) => cleanStrings(input),
  async beforeDelete(row) {
    const n = await prisma.project.count({ where: { categoryId: row.id } });
    if (n > 0) throw Errors.conflict(`This category is used by ${n} project${n === 1 ? "" : "s"}. Move them to another category first`);
  },
});

export const projectCategoriesRouter = collectionRouter({
  controller: new CollectionController(categoryService, "Project category"),
  schemas: { list: listQuery, create: projectCategoryCreate, update: projectCategoryUpdate },
  docs: { tag: "Projects", path: "/admin/project-categories", singular: "project category", plural: "project categories", record: recordSchema(projectCategoryCreate), publishable: false },
});

/* ───────── projects ───────── */

const projectInclude = {
  category: true,
  skills: { select: { skillId: true }, orderBy: { sortOrder: "asc" } },
  features: { orderBy: { sortOrder: "asc" } },
  media: { include: { media: true }, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
} satisfies Prisma.ProjectInclude;

const projectRepo = new CollectionRepository((db) => db.project, {
  include: projectInclude,
  searchFields: ["title", "titleAr", "slug", "shortDescription"],
  sortable: ["title", "sortOrder", "createdAt", "updatedAt", "publishedAt"],
  defaultOrder: { field: "sortOrder", order: "asc" },
});

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export function toProjectDto(row: ProjectRow) {
  const { skills, media, ...rest } = plain(row) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const gallery = (media as any[]).map((m) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: m.id,
    mediaId: m.mediaId,
    url: absoluteMediaUrl(m.media?.publicUrl),
    alt: m.media?.altText ?? null,
    caption: m.caption,
    captionAr: m.captionAr,
    isCover: m.isCover,
    isIllustrative: m.isIllustrative,
    sortOrder: m.sortOrder,
  }));
  const cover = gallery.find((g) => g.isCover) ?? gallery[0];
  return {
    ...rest,
    skillIds: (skills as { skillId: number }[]).map((s) => s.skillId),
    media: gallery,
    coverUrl: cover?.url ?? null,
  };
}

async function syncSkills(tx: Tx, projectId: number, skillIds?: number[]) {
  if (!skillIds) return;
  const unique = [...new Set(skillIds)];
  const found = await tx.skill.count({ where: { id: { in: unique } } });
  if (found !== unique.length) throw Errors.validation([{ path: "skillIds", message: "One or more skills do not exist" }]);
  await tx.projectSkill.deleteMany({ where: { projectId } });
  if (unique.length) await tx.projectSkill.createMany({ data: unique.map((skillId, sortOrder) => ({ projectId, skillId, sortOrder })) });
}

const projectService = defineCollection({ create: projectCreate, update: projectUpdate }, {
  entity: "Project",
  auditType: "project",
  repo: projectRepo,
  toDto: (row) => toProjectDto(row as ProjectRow),
  buildWhere: (q: { status?: string; categoryId?: number; featured?: boolean }) => ({
    ...(q.status ? { status: q.status } : {}),
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.featured !== undefined ? { featured: q.featured } : {}),
  }),
  async buildCreate(input, { nextSort }) {
    const clean = cleanStrings(omit(input, "skillIds", "slug"));
    const status = input.status ?? "DRAFT";
    return {
      stage: "COMPLETED",
      featured: false,
      ...clean,
      slug: await makeUniqueSlug(prisma.project, input.title, input.slug),
      sortOrder: input.sortOrder ?? nextSort,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    };
  },
  async buildUpdate(input, current) {
    const data: Record<string, unknown> = cleanStrings(omit(input, "skillIds", "slug"));
    if (input.slug) data.slug = await makeUniqueSlug(prisma.project, current.title, input.slug, current.id);
    if (input.status === "PUBLISHED" && !current.publishedAt) data.publishedAt = new Date();
    return data;
  },
  async afterWrite(tx, row, input) {
    await syncSkills(tx, row.id, (input as { skillIds?: number[] }).skillIds);
  },
  publishable: true,
  hasPublishedAt: true,
  trackEditor: true,
  async decorate(rows, dtos) {
    const ids = [...new Set(rows.map((r) => r.updatedById).filter(Boolean))] as string[];
    if (!ids.length) return;
    const names = new Map((await prisma.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
    rows.forEach((r, i) => ((dtos[i] as Record<string, unknown>).updatedByName = names.get(r.updatedById) ?? null));
  },
});

/** Copies a project as a new DRAFT, including features, gallery links and technologies. */
async function duplicateProject(actor: Actor, id: number) {
  const src = await prisma.project.findUnique({ where: { id }, include: { features: true, media: true, skills: true } });
  if (!src) throw Errors.notFound("Project");
  const slug = await makeUniqueSlug(prisma.project, `${src.slug}-copy`);
  const sortOrder = (await prisma.project.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1;

  const copy = await prisma.$transaction(async (tx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, publishedAt: _p, slug: _s, features, media, skills, ...fields } = src;
    const p = await tx.project.create({
      data: { ...fields, title: `${src.title} (copy)`, titleAr: src.titleAr ? `${src.titleAr} (نسخة)` : null, slug, status: "DRAFT", featured: false, sortOrder: sortOrder + 1 },
    });
    if (features.length) await tx.projectFeature.createMany({ data: features.map(({ id: _fid, projectId: _pid, ...f }) => ({ ...f, projectId: p.id })) });
    if (media.length) await tx.projectMedia.createMany({ data: media.map(({ id: _mid, projectId: _pid, ...m }) => ({ ...m, projectId: p.id })) });
    if (skills.length) await tx.projectSkill.createMany({ data: skills.map(({ projectId: _pid, ...s }) => ({ ...s, projectId: p.id })) });
    return p;
  });
  await audit(actor, { action: "project.duplicated", entityType: "Project", entityId: copy.id, metadata: { from: id } });
  void revalidateWebsite();
  return projectService.get(copy.id);
}

const projectController = new CollectionController(projectService, "Project");

const projectDoc = recordSchema(projectCreate, {
  skillIds: z.array(z.number()),
  coverUrl: z.string().nullable(),
  media: z.array(z.object({ id: z.number(), mediaId: z.number(), url: z.string().nullable(), isCover: z.boolean(), isIllustrative: z.boolean() })),
});

registry.registerPath({ method: "post", path: "/admin/projects/{id}/duplicate", tags: ["Projects"], summary: "Duplicate a project", description: "Creates a DRAFT copy with its features, gallery links and technologies.", security: writeSecurity, request: { params: idPathParams }, responses: { 201: jsonOk("Duplicated", projectDoc), 404: errorResponses[404] } });
registry.registerPath({ method: "put", path: "/admin/projects/{id}/skills", tags: ["Projects"], summary: "Replace the technologies of a project", security: writeSecurity, request: { params: idPathParams, body: jsonBody(projectSkillsReplace) }, responses: { 200: jsonOk("Updated", projectDoc), 400: errorResponses[400], 404: errorResponses[404] } });

export const projectsRouter = collectionRouter({
  controller: projectController,
  schemas: { list: projectList, create: projectCreate, update: projectUpdate },
  docs: { tag: "Projects", path: "/admin/projects", singular: "project", plural: "projects", record: projectDoc, publishable: true },
  extra(r) {
    r.post("/:id/duplicate", editor, validate({ params: idParams }), async (req, res) => created(res, await duplicateProject(req.auth!, Number(req.params.id)), "Project duplicated"));
    r.put("/:id/skills", editor, validate({ params: idParams, body: projectSkillsReplace }), async (req, res) =>
      ok(res, await projectService.update(req.auth!, Number(req.params.id), { skillIds: (req.body as { skillIds: number[] }).skillIds } as never), "Technologies updated"),
    );
  },
});

/* ───────── features ───────── */

const featureRepo = new CollectionRepository((db) => db.projectFeature, {
  searchFields: ["title", "titleAr"],
  sortable: ["sortOrder", "title"],
  defaultOrder: { field: "sortOrder", order: "asc" },
});

async function requireProject(id: number) {
  if (!(await prisma.project.findUnique({ where: { id }, select: { id: true } }))) {
    throw Errors.validation([{ path: "projectId", message: "That project does not exist" }]);
  }
}

const featureService = defineCollection({ create: projectFeatureCreate, update: projectFeatureUpdate }, {
  entity: "Project feature",
  auditType: "project_feature",
  repo: featureRepo,
  toDto: (row) => plain(row),
  buildWhere: (q: { projectId?: number }) => (q.projectId ? { projectId: q.projectId } : {}),
  sortScope: (input) => ({ projectId: input.projectId }),
  async buildCreate(input, { nextSort }) {
    await requireProject(input.projectId);
    return { ...cleanStrings(input), sortOrder: input.sortOrder ?? nextSort };
  },
  buildUpdate: (input) => cleanStrings(input),
});

export const projectFeaturesRouter = collectionRouter({
  controller: new CollectionController(featureService, "Feature"),
  schemas: { list: projectFeatureList, create: projectFeatureCreate, update: projectFeatureUpdate },
  docs: { tag: "Projects", path: "/admin/project-features", singular: "project feature", plural: "project features", record: recordSchema(projectFeatureCreate), publishable: false },
});

/* ───────── gallery media ───────── */

const mediaLinkRepo = new CollectionRepository((db) => db.projectMedia, {
  include: { media: true },
  searchFields: ["caption", "captionAr"],
  sortable: ["sortOrder"],
  defaultOrder: { field: "sortOrder", order: "asc" },
});

/** Only one cover image per project. */
async function singleCover(tx: Tx, row: { id: number; projectId: number }, isCover: boolean | undefined) {
  if (isCover) await tx.projectMedia.updateMany({ where: { projectId: row.projectId, id: { not: row.id } }, data: { isCover: false } });
}

const mediaLinkService = defineCollection({ create: projectMediaCreate, update: projectMediaUpdate }, {
  entity: "Project media",
  auditType: "project_media",
  repo: mediaLinkRepo,
  toDto: (row) => {
    const { media, ...rest } = plain(row);
    return { ...rest, url: absoluteMediaUrl(media?.publicUrl), alt: media?.altText ?? null, mimeType: media?.mimeType ?? null };
  },
  buildWhere: (q: { projectId?: number }) => (q.projectId ? { projectId: q.projectId } : {}),
  sortScope: (input) => ({ projectId: input.projectId }),
  async buildCreate(input, { nextSort }) {
    await requireProject(input.projectId);
    if (!(await prisma.media.findUnique({ where: { id: input.mediaId }, select: { id: true } }))) {
      throw Errors.validation([{ path: "mediaId", message: "That file is not in the media library" }]);
    }
    return { ...cleanStrings(input), sortOrder: input.sortOrder ?? nextSort };
  },
  buildUpdate: (input) => cleanStrings(input),
  async afterWrite(tx, row, input) {
    await singleCover(tx, row as { id: number; projectId: number }, (input as { isCover?: boolean }).isCover);
  },
});

export const projectMediaRouter = collectionRouter({
  controller: new CollectionController(mediaLinkService, "Project image"),
  schemas: { list: projectMediaList, create: projectMediaCreate, update: projectMediaUpdate },
  docs: { tag: "Projects", path: "/admin/project-media", singular: "project image", plural: "project images", record: recordSchema(projectMediaCreate, { url: z.string().nullable() }), publishable: false },
});

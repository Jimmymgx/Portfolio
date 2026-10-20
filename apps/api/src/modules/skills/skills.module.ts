import { skillCategoryCreate, skillCategoryList, skillCategoryUpdate, skillCreate, skillList, skillUpdate } from "@portfolio/validation";
import { z } from "zod";
import { CollectionController } from "../../common/crud/collection.controller.js";
import { CollectionRepository } from "../../common/crud/collection.repository.js";
import { collectionRouter } from "../../common/crud/collection.routes.js";
import { defineCollection } from "../../common/crud/collection.service.js";
import { Errors } from "../../common/errors/app-error.js";
import { recordSchema } from "../../common/openapi.js";
import { makeUniqueSlug } from "../../common/utils/slug.js";
import { cleanStrings } from "../../common/utils/text.js";
import { omit, plain } from "../../common/utils/serialize.js";
import { absoluteMediaUrl } from "../../common/storage/storage.js";
import { prisma, type Tx } from "../../config/database.js";

/* ───────── categories ───────── */

const categoryRepo = new CollectionRepository((db) => db.skillCategory, {
  searchFields: ["name", "nameAr", "slug"],
  sortable: ["name", "sortOrder"],
  defaultOrder: { field: "sortOrder", order: "asc" },
});

const categoryService = defineCollection({ create: skillCategoryCreate, update: skillCategoryUpdate }, {
  entity: "Skill category",
  auditType: "skill_category",
  repo: categoryRepo,
  toDto: (row) => plain(row),
  buildWhere: (q: { status?: string }) => (q.status ? { status: q.status } : {}),
  async buildCreate(input, { nextSort }) {
    const { slug, ...rest } = cleanStrings(input);
    return { ...rest, slug: await makeUniqueSlug(prisma.skillCategory, input.name, slug), sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" };
  },
  buildUpdate: (input) => cleanStrings(input),
  publishable: true,
  async beforeDelete(row) {
    const n = await prisma.skill.count({ where: { categoryId: row.id } });
    if (n > 0) throw Errors.conflict(`This category still has ${n} skill${n === 1 ? "" : "s"}. Move or delete them first`);
  },
});

export const skillCategoriesRouter = collectionRouter({
  controller: new CollectionController(categoryService, "Skill category"),
  schemas: { list: skillCategoryList, create: skillCategoryCreate, update: skillCategoryUpdate },
  docs: { tag: "Skills", path: "/admin/skill-categories", singular: "skill category", plural: "skill categories", record: recordSchema(skillCategoryCreate), publishable: true },
});

/* ───────── skills ───────── */

const skillRepo = new CollectionRepository((db) => db.skill, {
  include: { logo: true, projects: { select: { projectId: true } } },
  searchFields: ["name", "symbol", "slug"],
  sortable: ["name", "sortOrder", "createdAt"],
  defaultOrder: { field: "sortOrder", order: "asc" },
});

/** Replaces the project links of a skill inside the write transaction. */
async function syncProjects(tx: Tx, skillId: number, projectIds?: number[]) {
  if (!projectIds) return;
  const unique = [...new Set(projectIds)];
  const found = await tx.project.count({ where: { id: { in: unique } } });
  if (found !== unique.length) throw Errors.validation([{ path: "projectIds", message: "One or more projects do not exist" }]);
  await tx.projectSkill.deleteMany({ where: { skillId, projectId: { notIn: unique } } });
  for (const projectId of unique) {
    await tx.projectSkill.upsert({ where: { projectId_skillId: { projectId, skillId } }, create: { projectId, skillId }, update: {} });
  }
}

const skillService = defineCollection({ create: skillCreate, update: skillUpdate }, {
  entity: "Skill",
  auditType: "skill",
  repo: skillRepo,
  toDto: (row) => {
    const { projects, logo, ...rest } = plain(row);
    return { ...rest, projectIds: (projects as { projectId: number }[]).map((p) => p.projectId), logoUrl: absoluteMediaUrl(logo?.publicUrl) };
  },
  buildWhere: (q: { status?: string; categoryId?: number }) => ({ ...(q.status ? { status: q.status } : {}), ...(q.categoryId ? { categoryId: q.categoryId } : {}) }),
  sortScope: (input) => ({ categoryId: input.categoryId }),
  async buildCreate(input, { nextSort }) {
    const clean = cleanStrings(omit(input, "projectIds", "slug"));
    return { ...clean, slug: await makeUniqueSlug(prisma.skill, input.name, input.slug), sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" };
  },
  async buildUpdate(input, current) {
    const data = cleanStrings(omit(input, "projectIds", "slug"));
    if (input.slug) return { ...data, slug: await makeUniqueSlug(prisma.skill, current.name, input.slug, current.id) };
    return data;
  },
  async afterWrite(tx, row, input) {
    await syncProjects(tx, row.id, (input as { projectIds?: number[] }).projectIds);
  },
  publishable: true,
});

export const skillsRouter = collectionRouter({
  controller: new CollectionController(skillService, "Skill"),
  schemas: { list: skillList, create: skillCreate, update: skillUpdate },
  docs: { tag: "Skills", path: "/admin/skills", singular: "skill", plural: "skills", record: recordSchema(skillCreate, { logoUrl: z.string().nullable(), projectIds: z.array(z.number()) }), publishable: true },
});

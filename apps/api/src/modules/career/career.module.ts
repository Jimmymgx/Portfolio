import {
  achievementCreate,
  achievementList,
  achievementUpdate,
  certificationCreate,
  certificationList,
  certificationUpdate,
  educationCreate,
  educationList,
  educationUpdate,
  experienceCreate,
  experienceList,
  experienceUpdate,
} from "@portfolio/validation";
import { z } from "zod";
import { CollectionController } from "../../common/crud/collection.controller.js";
import { CollectionRepository } from "../../common/crud/collection.repository.js";
import { collectionRouter } from "../../common/crud/collection.routes.js";
import { defineCollection } from "../../common/crud/collection.service.js";
import { Errors } from "../../common/errors/app-error.js";
import { recordSchema } from "../../common/openapi.js";
import { absoluteMediaUrl } from "../../common/storage/storage.js";
import { dateIn, dateOut, plain } from "../../common/utils/serialize.js";
import { cleanStrings } from "../../common/utils/text.js";
import { prisma } from "../../config/database.js";

const statusWhere = (q: { status?: string }) => (q.status ? { status: q.status } : {});

/** Converts the date strings of a validated body to Date objects. Fields that were not sent stay untouched. */
function withDates<T extends Record<string, unknown>>(input: T, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = cleanStrings(input);
  for (const f of fields) if (f in out) out[f] = dateIn(out[f] as string | null);
  return out;
}

async function requireMedia(id: number | null | undefined, path: string) {
  if (id && !(await prisma.media.findUnique({ where: { id }, select: { id: true } }))) {
    throw Errors.validation([{ path, message: "That file is not in the media library" }]);
  }
}

/* ───────── experience ───────── */

const experienceService = defineCollection({ create: experienceCreate, update: experienceUpdate }, {
  entity: "Experience",
  auditType: "experience",
  repo: new CollectionRepository((db) => db.experience, {
    searchFields: ["organization", "position", "organizationAr", "positionAr"],
    sortable: ["startDate", "organization", "sortOrder", "createdAt"],
    defaultOrder: { field: "startDate", order: "desc" },
  }),
  toDto: (row) => ({ ...plain(row), startDate: dateOut(row.startDate), endDate: dateOut(row.endDate) }),
  buildWhere: statusWhere,
  buildCreate(input, { nextSort }) {
    const data = withDates(input, ["startDate", "endDate"]);
    if (input.isCurrent) data.endDate = null;
    return { isCurrent: false, ...data, sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" };
  },
  buildUpdate(input, current) {
    const data = withDates(input, ["startDate", "endDate"]);
    const isCurrent = (input.isCurrent ?? current.isCurrent) as boolean;
    if (isCurrent) data.endDate = null;
    const start = (data.startDate ?? current.startDate) as Date;
    const end = (data.endDate ?? (isCurrent ? null : current.endDate)) as Date | null;
    if (end && start && end < start) throw Errors.validation([{ path: "endDate", message: "The end date cannot be before the start date" }]);
    return data;
  },
  publishable: true,
});

export const experienceRouter = collectionRouter({
  controller: new CollectionController(experienceService, "Experience"),
  schemas: { list: experienceList, create: experienceCreate, update: experienceUpdate },
  docs: { tag: "Experience", path: "/admin/experience", singular: "experience entry", plural: "experience entries", record: recordSchema(experienceUpdate as z.ZodType), publishable: true },
});

/* ───────── education ───────── */

const educationService = defineCollection({ create: educationCreate, update: educationUpdate }, {
  entity: "Education",
  auditType: "education",
  repo: new CollectionRepository((db) => db.education, {
    searchFields: ["institution", "qualification", "fieldOfStudy", "institutionAr", "qualificationAr"],
    sortable: ["endDate", "institution", "sortOrder", "createdAt"],
    defaultOrder: { field: "endDate", order: "desc" },
  }),
  toDto: (row) => ({ ...plain(row), startDate: dateOut(row.startDate), endDate: dateOut(row.endDate) }),
  buildWhere: statusWhere,
  buildCreate: (input, { nextSort }) => ({ ...withDates(input, ["startDate", "endDate"]), sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" }),
  buildUpdate: (input) => withDates(input, ["startDate", "endDate"]),
  publishable: true,
});

export const educationRouter = collectionRouter({
  controller: new CollectionController(educationService, "Education entry"),
  schemas: { list: educationList, create: educationCreate, update: educationUpdate },
  docs: { tag: "Education", path: "/admin/education", singular: "education entry", plural: "education entries", record: recordSchema(educationCreate), publishable: true },
});

/* ───────── certifications ───────── */

const certificationService = defineCollection({ create: certificationCreate, update: certificationUpdate }, {
  entity: "Certification",
  auditType: "certification",
  repo: new CollectionRepository((db) => db.certification, {
    include: { media: true },
    searchFields: ["title", "issuer", "titleAr", "issuerAr"],
    sortable: ["title", "issueDate", "sortOrder", "createdAt"],
    defaultOrder: { field: "sortOrder", order: "asc" },
  }),
  toDto: (row) => {
    const { media, ...rest } = plain(row);
    return { ...rest, issueDate: dateOut(row.issueDate), imageUrl: absoluteMediaUrl(media?.publicUrl) };
  },
  buildWhere: statusWhere,
  async buildCreate(input, { nextSort }) {
    await requireMedia(input.mediaId, "mediaId");
    return { ...withDates(input, ["issueDate"]), sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" };
  },
  async buildUpdate(input) {
    await requireMedia(input.mediaId, "mediaId");
    return withDates(input, ["issueDate"]);
  },
  publishable: true,
});

export const certificationsRouter = collectionRouter({
  controller: new CollectionController(certificationService, "Certification"),
  schemas: { list: certificationList, create: certificationCreate, update: certificationUpdate },
  docs: { tag: "Certifications", path: "/admin/certifications", singular: "certification", plural: "certifications", record: recordSchema(certificationCreate, { imageUrl: z.string().nullable() }), publishable: true },
});

/* ───────── achievements ───────── */

const achievementService = defineCollection({ create: achievementCreate, update: achievementUpdate }, {
  entity: "Achievement",
  auditType: "achievement",
  repo: new CollectionRepository((db) => db.achievement, {
    include: { logo: true },
    searchFields: ["title", "titleAr", "platform"],
    sortable: ["title", "sortOrder", "createdAt"],
    defaultOrder: { field: "sortOrder", order: "asc" },
  }),
  toDto: (row) => {
    const { logo, ...rest } = plain(row);
    return { ...rest, logoUrl: absoluteMediaUrl(logo?.publicUrl) };
  },
  buildWhere: statusWhere,
  async buildCreate(input, { nextSort }) {
    await requireMedia(input.logoMediaId, "logoMediaId");
    return { ...cleanStrings(input), sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" };
  },
  async buildUpdate(input) {
    await requireMedia(input.logoMediaId, "logoMediaId");
    return cleanStrings(input);
  },
  publishable: true,
});

export const achievementsRouter = collectionRouter({
  controller: new CollectionController(achievementService, "Achievement"),
  schemas: { list: achievementList, create: achievementCreate, update: achievementUpdate },
  docs: { tag: "Achievements", path: "/admin/achievements", singular: "achievement", plural: "achievements", record: recordSchema(achievementCreate, { logoUrl: z.string().nullable() }), publishable: true },
});

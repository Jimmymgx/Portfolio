import { aboutFactCreate, aboutFactList, aboutFactUpdate, socialLinkCreate, socialLinkList, socialLinkUpdate } from "@portfolio/validation";
import { CollectionController } from "../../common/crud/collection.controller.js";
import { CollectionRepository } from "../../common/crud/collection.repository.js";
import { collectionRouter } from "../../common/crud/collection.routes.js";
import { defineCollection } from "../../common/crud/collection.service.js";
import { recordSchema } from "../../common/openapi.js";
import { plain } from "../../common/utils/serialize.js";
import { cleanStrings } from "../../common/utils/text.js";

const statusWhere = (q: { status?: string }) => (q.status ? { status: q.status } : {});

/* ───────── social links ───────── */

const socialService = defineCollection({ create: socialLinkCreate, update: socialLinkUpdate }, {
  entity: "Social link",
  auditType: "social_link",
  repo: new CollectionRepository((db) => db.socialLink, {
    searchFields: ["label", "labelAr", "handle", "url"],
    sortable: ["sortOrder", "label", "platform"],
    defaultOrder: { field: "sortOrder", order: "asc" },
  }),
  toDto: (row) => plain(row),
  buildWhere: statusWhere,
  buildCreate: (input, { nextSort }) => ({ ...cleanStrings(input), sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" }),
  buildUpdate: (input) => cleanStrings(input),
  publishable: true,
});

export const socialLinksRouter = collectionRouter({
  controller: new CollectionController(socialService, "Social link"),
  schemas: { list: socialLinkList, create: socialLinkCreate, update: socialLinkUpdate },
  docs: { tag: "Social links", path: "/admin/social-links", singular: "social link", plural: "social links", record: recordSchema(socialLinkCreate), publishable: true },
});

/* ───────── about quick facts ───────── */

const factService = defineCollection({ create: aboutFactCreate, update: aboutFactUpdate }, {
  entity: "About fact",
  auditType: "about_fact",
  repo: new CollectionRepository((db) => db.aboutFact, {
    searchFields: ["label", "labelAr", "value", "valueAr"],
    sortable: ["sortOrder", "label"],
    defaultOrder: { field: "sortOrder", order: "asc" },
  }),
  toDto: (row) => plain(row),
  buildWhere: statusWhere,
  buildCreate: (input, { nextSort }) => ({ ...cleanStrings(input), sortOrder: input.sortOrder ?? nextSort, status: input.status ?? "DRAFT" }),
  buildUpdate: (input) => cleanStrings(input),
  publishable: true,
});

export const aboutFactsRouter = collectionRouter({
  controller: new CollectionController(factService, "Fact"),
  schemas: { list: aboutFactList, create: aboutFactCreate, update: aboutFactUpdate },
  docs: { tag: "About", path: "/admin/about-facts", singular: "about fact", plural: "about facts", record: recordSchema(aboutFactCreate), publishable: true },
});

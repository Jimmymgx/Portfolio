import { z, type ZodType } from "zod";
import { envelope, errorResponses, registry } from "../config/swagger.js";

export const readSecurity = [{ sessionCookie: [] }];
export const writeSecurity = [{ sessionCookie: [], csrfToken: [] }];

export const jsonBody = (schema: ZodType) => ({ required: true, content: { "application/json": { schema } } });
export const jsonOk = (description: string, schema: ZodType) => ({
  description,
  content: { "application/json": { schema: envelope(schema) } },
});
export const pageMetaSchema = z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() });
export const pagedOk = (description: string, item: ZodType) => ({
  description,
  content: {
    "application/json": {
      schema: z.object({ success: z.literal(true), message: z.string(), data: z.array(item), meta: pageMetaSchema }),
    },
  },
});
export const idPathParams = z.object({ id: z.number().int().positive().describe("Record id") });

/** Documentation schema for a returned record: the editable fields (all optional) plus identity and timestamps. */
export function recordSchema(create: ZodType, extra: z.ZodRawShape = {}): ZodType {
  const base = create instanceof z.ZodObject ? (create as z.ZodObject).partial() : z.object({});
  return base.extend({
    id: z.number().int(),
    status: z.enum(["DRAFT", "PUBLISHED", "UNPUBLISHED"]).optional(),
    sortOrder: z.number().int().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    ...extra,
  });
}

export interface CrudDocs {
  tag: string;
  /** Path relative to /api/v1, for example "/admin/skills". */
  path: string;
  singular: string;
  plural: string;
  record: ZodType;
  list: ZodType;
  create: ZodType;
  update: ZodType;
  publishable?: boolean;
  reorderable?: boolean;
  /** "SUPER_ADMIN" if deletion needs more than the editor role. */
  deleteRole?: string;
}

/** Registers the standard CRUD operations. Called by the same factory that creates the routes, so docs cannot drift. */
export function registerCrudDocs(d: CrudDocs) {
  const { tag, path } = d;
  const listQuery = d.list instanceof z.ZodObject ? d.list : z.object({});
  registry.registerPath({
    method: "get",
    path,
    tags: [tag],
    summary: `List ${d.plural}`,
    description: "Supports `page`, `pageSize`, `q` (search), `sort`, `order` and the entity filters listed below. Requires at least the VIEWER role.",
    security: readSecurity,
    request: { query: listQuery as z.ZodObject },
    responses: { 200: pagedOk(`${d.plural}`, d.record), 401: errorResponses[401], 403: errorResponses[403] },
  });
  registry.registerPath({
    method: "post",
    path,
    tags: [tag],
    summary: `Create ${d.singular}`,
    description: "Requires the EDITOR role. New records default to DRAFT and are appended at the end of the order.",
    security: writeSecurity,
    request: { body: jsonBody(d.create) },
    responses: { 201: jsonOk(`${d.singular} created`, d.record), 400: errorResponses[400], 401: errorResponses[401], 403: errorResponses[403], 409: errorResponses[409] },
  });
  registry.registerPath({
    method: "get",
    path: `${path}/{id}`,
    tags: [tag],
    summary: `Get ${d.singular}`,
    security: readSecurity,
    request: { params: idPathParams },
    responses: { 200: jsonOk(d.singular, d.record), 401: errorResponses[401], 404: errorResponses[404] },
  });
  registry.registerPath({
    method: "patch",
    path: `${path}/{id}`,
    tags: [tag],
    summary: `Update ${d.singular}`,
    description: "Partial update. Requires the EDITOR role.",
    security: writeSecurity,
    request: { params: idPathParams, body: jsonBody(d.update) },
    responses: { 200: jsonOk(`${d.singular} updated`, d.record), 400: errorResponses[400], 403: errorResponses[403], 404: errorResponses[404], 409: errorResponses[409] },
  });
  registry.registerPath({
    method: "delete",
    path: `${path}/{id}`,
    tags: [tag],
    summary: `Delete ${d.singular}`,
    description: `Requires the ${d.deleteRole ?? "EDITOR"} role. Fails with 409 if other content still depends on it.`,
    security: writeSecurity,
    request: { params: idPathParams },
    responses: { 204: { description: "Deleted" }, 403: errorResponses[403], 404: errorResponses[404], 409: errorResponses[409] },
  });
  if (d.reorderable !== false) {
    registry.registerPath({
      method: "post",
      path: `${path}/reorder`,
      tags: [tag],
      summary: `Reorder ${d.plural}`,
      description: "Send the ids in their new order. The existing sort slots are reassigned, so a filtered subset can be reordered safely.",
      security: writeSecurity,
      request: { body: jsonBody(z.object({ ids: z.array(z.number().int()).min(1) })) },
      responses: { 200: jsonOk("Order saved", z.null()), 400: errorResponses[400], 404: errorResponses[404] },
    });
  }
  if (d.publishable) {
    for (const action of ["publish", "unpublish"] as const) {
      registry.registerPath({
        method: "post",
        path: `${path}/{id}/${action}`,
        tags: [tag],
        summary: `${action === "publish" ? "Publish" : "Unpublish"} ${d.singular}`,
        description: action === "publish" ? "Makes the record visible on the public website." : "Hides the record from the public website without deleting it.",
        security: writeSecurity,
        request: { params: idPathParams },
        responses: { 200: jsonOk(`${d.singular} ${action}ed`, d.record), 404: errorResponses[404] },
      });
    }
  }
}

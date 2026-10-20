import type { Request, Response } from "express";
import { Router } from "express";
import { z, type ZodType } from "zod";
import { editor, viewer } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { jsonBody, jsonOk, readSecurity, writeSecurity } from "../openapi.js";
import { ok } from "../responses/response.js";
import type { SingletonService } from "./singleton.service.js";

interface Options {
  service: SingletonService;
  update: ZodType;
  fields: ZodType;
  tag: string;
  /** Path relative to /api/v1, for example "/admin/profile". */
  path: string;
  singular: string;
  /** For keyed singletons such as SEO (one record per page key). */
  keyParam?: { name: string; schema: ZodType };
}

/**
 * Admin routes for a draft/publish singleton:
 *   GET /      draft and published copies side by side
 *   PATCH /    save changes to the draft
 *   POST /publish
 *   POST /discard-draft
 */
export function singletonRouter(o: Options): Router {
  const r = Router();
  const prefix = o.keyParam ? `/:${o.keyParam.name}` : "";
  const keyOf = (req: Request) => (o.keyParam ? { [o.keyParam.name]: (req.params as Record<string, string>)[o.keyParam.name] } : {});
  const params = o.keyParam ? { params: z.object({ [o.keyParam.name]: o.keyParam.schema }) } : {};
  const paramSchema = o.keyParam ? z.object({ [o.keyParam.name]: o.keyParam.schema }) : undefined;

  const record = z.object({
    draft: z.record(z.string(), z.unknown()).nullable(),
    published: z.record(z.string(), z.unknown()).nullable(),
    hasUnpublishedChanges: z.boolean(),
  });
  const docPath = (suffix = "") => `${o.path}${o.keyParam ? `/{${o.keyParam.name}}` : ""}${suffix}`;
  const req = paramSchema ? { params: paramSchema as z.ZodObject } : {};

  registry.registerPath({ method: "get", path: docPath(), tags: [o.tag], summary: `Get ${o.singular} (draft and published)`, security: readSecurity, request: req, responses: { 200: jsonOk(o.singular, record), 401: errorResponses[401] } });
  registry.registerPath({
    method: "patch",
    path: docPath(),
    tags: [o.tag],
    summary: `Save ${o.singular} draft`,
    description: "Partial update of the draft. The public website does not change until you publish. Requires the EDITOR role.",
    security: writeSecurity,
    request: { ...req, body: jsonBody(o.update) },
    responses: { 200: jsonOk("Draft saved", record), 400: errorResponses[400], 403: errorResponses[403] },
  });
  registry.registerPath({ method: "post", path: docPath("/publish"), tags: [o.tag], summary: `Publish ${o.singular}`, description: "Copies the draft over the live version and refreshes the website.", security: writeSecurity, request: req, responses: { 200: jsonOk("Published", record), 409: errorResponses[409] } });
  registry.registerPath({ method: "post", path: docPath("/discard-draft"), tags: [o.tag], summary: `Discard ${o.singular} draft`, description: "Deletes unpublished edits and returns to the live version.", security: writeSecurity, request: req, responses: { 200: jsonOk("Draft discarded", record) } });

  r.get(`${prefix}/`, viewer, validate(params), async (req: Request, res: Response) => ok(res, await o.service.get(keyOf(req))));
  r.patch(`${prefix}/`, editor, validate({ ...params, body: o.update }), async (req: Request, res: Response) =>
    ok(res, await o.service.updateDraft(req.auth!, req.body as Record<string, unknown>, keyOf(req)), "Draft saved"),
  );
  r.post(`${prefix}/publish`, editor, validate(params), async (req: Request, res: Response) => ok(res, await o.service.publish(req.auth!, keyOf(req)), "Published"));
  r.post(`${prefix}/discard-draft`, editor, validate(params), async (req: Request, res: Response) => ok(res, await o.service.discardDraft(req.auth!, keyOf(req)), "Draft discarded"));
  return r;
}

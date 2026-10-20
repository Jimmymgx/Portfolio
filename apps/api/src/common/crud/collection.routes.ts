import { Router } from "express";
import { idParams, reorderBody } from "@portfolio/validation";
import type { ZodType } from "zod";
import { editor, superAdmin, viewer } from "../../middlewares/authorize.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { registerCrudDocs, type CrudDocs } from "../openapi.js";
import type { CollectionController } from "./collection.controller.js";

interface Options {
  controller: CollectionController<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  schemas: { list: ZodType; create: ZodType; update: ZodType };
  docs: Omit<CrudDocs, "list" | "create" | "update">;
  /** Extra routes. Registered before `/:id` so static paths such as `/duplicate` are not captured as ids. */
  extra?: (router: Router) => void;
  /** Deleting needs SUPER_ADMIN instead of EDITOR. */
  deleteRole?: "SUPER_ADMIN";
}

/**
 * Standard admin routes for an ordered collection:
 *   GET /, POST /, POST /reorder, GET /:id, PATCH /:id, DELETE /:id, POST /:id/publish, POST /:id/unpublish
 * Reads need VIEWER, writes need EDITOR. The router is mounted behind `authenticate` and `csrfProtection`.
 */
export function collectionRouter(o: Options): Router {
  const r = Router();
  const c = o.controller;
  const reorderable = o.docs.reorderable !== false;

  registerCrudDocs({ ...o.docs, list: o.schemas.list, create: o.schemas.create, update: o.schemas.update, deleteRole: o.deleteRole });

  r.get("/", viewer, validate({ query: o.schemas.list }), c.list);
  r.post("/", editor, validate({ body: o.schemas.create }), c.create);
  if (reorderable) r.post("/reorder", editor, validate({ body: reorderBody }), c.reorder);
  o.extra?.(r);
  r.get("/:id", viewer, validate({ params: idParams }), c.get);
  r.patch("/:id", editor, validate({ params: idParams, body: o.schemas.update }), c.update);
  r.delete("/:id", o.deleteRole ? superAdmin : editor, validate({ params: idParams }), c.remove);
  if (o.docs.publishable) {
    r.post("/:id/publish", editor, validate({ params: idParams }), c.publish);
    r.post("/:id/unpublish", editor, validate({ params: idParams }), c.unpublish);
  }
  return r;
}

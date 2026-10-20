import express, { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { idParams, mediaList, mediaUpdate } from "@portfolio/validation";
import { MEDIA_LIMITS } from "@portfolio/validation";
import { Errors } from "../../common/errors/app-error.js";
import { getLocalRoot } from "../../common/storage/storage.js";
import { jsonBody, jsonOk, pagedOk, readSecurity, recordSchema, writeSecurity, idPathParams } from "../../common/openapi.js";
import { created, noContent, ok, paginated } from "../../common/responses/response.js";
import { errorResponses, registry } from "../../config/swagger.js";
import { editor, viewer } from "../../middlewares/authorize.middleware.js";
import { uploadLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { mediaService } from "./media.service.js";

const MAX_BYTES = Math.max(MEDIA_LIMITS.image.maxBytes, MEDIA_LIMITS.video.maxBytes, MEDIA_LIMITS.document.maxBytes);
const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 5 } });

/** Reads exactly one file from the `file` field and rejects everything else. */
function singleFile(req: Request, res: Response, next: NextFunction) {
  uploader.single("file")(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(Errors.upload("Attach a file in the `file` field"));
    next();
  });
}

export const mediaRouter = Router();

const mediaDoc = recordSchema(z.object({ originalName: z.string(), title: z.string().nullable(), publicUrl: z.string(), mimeType: z.string(), kind: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]), fileSize: z.number(), width: z.number().nullable(), height: z.number().nullable(), altText: z.string().nullable(), altTextAr: z.string().nullable(), usageCount: z.number().optional() }));
const multipart = { required: true, content: { "multipart/form-data": { schema: z.object({ file: z.string().openapi({ type: "string", format: "binary" }) }) } } };

registry.registerPath({ method: "get", path: "/admin/media", tags: ["Media"], summary: "List media", description: "Filter with `kind` and `unused=true`. Each item reports how many records use it.", security: readSecurity, request: { query: mediaList as z.ZodObject }, responses: { 200: pagedOk("Media", mediaDoc), 401: errorResponses[401] } });
registry.registerPath({ method: "post", path: "/admin/media", tags: ["Media"], summary: "Upload a file", description: "multipart/form-data with a `file` field. The type is detected from the file bytes. Images up to 8 MB, videos 80 MB, PDFs 15 MB. Unsafe SVG is rejected. Identical files are reused.", security: writeSecurity, request: { body: multipart }, responses: { 201: jsonOk("Uploaded", mediaDoc), 400: errorResponses[400], 413: { description: "File too large" } } });
registry.registerPath({ method: "get", path: "/admin/media/{id}", tags: ["Media"], summary: "Get media", security: readSecurity, request: { params: idPathParams }, responses: { 200: jsonOk("Media", mediaDoc), 404: errorResponses[404] } });
registry.registerPath({ method: "patch", path: "/admin/media/{id}", tags: ["Media"], summary: "Edit title and alt text", security: writeSecurity, request: { params: idPathParams, body: jsonBody(mediaUpdate) }, responses: { 200: jsonOk("Updated", mediaDoc), 404: errorResponses[404] } });
registry.registerPath({ method: "put", path: "/admin/media/{id}/file", tags: ["Media"], summary: "Replace the file", description: "Keeps the record id, so every place that uses it shows the new file. The new file must be of the same kind.", security: writeSecurity, request: { params: idPathParams, body: multipart }, responses: { 200: jsonOk("Replaced", mediaDoc), 400: errorResponses[400] } });
registry.registerPath({ method: "get", path: "/admin/media/{id}/usage", tags: ["Media"], summary: "Where is this file used?", security: readSecurity, request: { params: idPathParams }, responses: { 200: jsonOk("Usage", z.array(z.object({ usedAs: z.string(), count: z.number() }))) } });
registry.registerPath({ method: "delete", path: "/admin/media/{id}", tags: ["Media"], summary: "Delete media", description: "Fails with 409 and the list of usages if any content still references the file.", security: writeSecurity, request: { params: idPathParams }, responses: { 204: { description: "Deleted" }, 409: errorResponses[409] } });

mediaRouter.get("/", viewer, validate({ query: mediaList }), async (req, res) => {
  const { items, meta } = await mediaService.list(req.query as never);
  return paginated(res, items, meta);
});
mediaRouter.post("/", editor, uploadLimiter, singleFile, async (req, res) => {
  const { media, duplicate } = await mediaService.upload(req.auth!, { buffer: req.file!.buffer, originalname: req.file!.originalname });
  return created(res, media, duplicate ? "This file was already in the library, so the existing copy was reused" : "File uploaded");
});
mediaRouter.get("/:id", viewer, validate({ params: idParams }), async (req, res) => ok(res, await mediaService.get(Number(req.params.id))));
mediaRouter.get("/:id/usage", viewer, validate({ params: idParams }), async (req, res) => ok(res, await mediaService.usage(Number(req.params.id))));
mediaRouter.patch("/:id", editor, validate({ params: idParams, body: mediaUpdate }), async (req, res) =>
  ok(res, await mediaService.updateMeta(req.auth!, Number(req.params.id), req.body), "Media updated"),
);
mediaRouter.put("/:id/file", editor, uploadLimiter, validate({ params: idParams }), singleFile, async (req, res) =>
  ok(res, await mediaService.replace(req.auth!, Number(req.params.id), { buffer: req.file!.buffer, originalname: req.file!.originalname }), "File replaced"),
);
mediaRouter.delete("/:id", editor, validate({ params: idParams }), async (req, res) => {
  await mediaService.remove(req.auth!, Number(req.params.id));
  return noContent(res);
});

/**
 * Serves locally stored files at /media/*. Keys are random, so files are cached for a year.
 * SVG is sandboxed with a restrictive CSP as defence in depth on top of upload-time rejection of unsafe SVG.
 */
export function mediaFilesRouter(): Router | null {
  const root = getLocalRoot();
  if (!root) return null;
  const r = Router();
  r.use(
    express.static(root, {
      index: false,
      dotfiles: "deny",
      fallthrough: true,
      immutable: true,
      maxAge: "365d",
      setHeaders(res, file) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("X-Content-Type-Options", "nosniff");
        if (file.toLowerCase().endsWith(".svg")) {
          res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        }
      },
    }),
  );
  return r;
}

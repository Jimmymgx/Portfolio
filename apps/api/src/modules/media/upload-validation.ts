import { fileTypeFromBuffer } from "file-type";
import { imageSize } from "image-size";
import { MEDIA_LIMITS } from "@portfolio/validation";
import { Errors } from "../../common/errors/app-error.js";

export type DetectedKind = "IMAGE" | "VIDEO" | "DOCUMENT";

export interface InspectedFile {
  mime: string;
  ext: string;
  kind: DetectedKind;
  width: number | null;
  height: number | null;
}

const SVG_MAX_BYTES = 1024 * 1024;

/**
 * Conservative SVG check. SVG is XML that can carry scripts, so anything that is not plain vector drawing is rejected
 * rather than rewritten: scripts, event handlers, foreignObject, DOCTYPE/ENTITY, and any non-fragment link or url().
 */
export function isSafeSvg(text: string): boolean {
  const head = text.trimStart().slice(0, 300).toLowerCase();
  if (!head.startsWith("<svg") && !head.startsWith("<?xml")) return false;
  const banned = [
    /<script/i,
    /\son[a-z]+\s*=/i,
    /javascript:/i,
    /<foreignobject/i,
    /<iframe|<embed|<object|<audio|<video/i,
    /<!doctype|<!entity/i,
    /(xlink:)?href\s*=\s*["'](?!#)/i,
    /url\(\s*["']?(?!#)/i,
    /@import/i,
    /<(?:animate|set)[^>]*attributeName\s*=\s*["']?(?:href|xlink:href)/i,
  ];
  return !banned.some((re) => re.test(text));
}

function kindOfMime(mime: string): DetectedKind | null {
  if ((MEDIA_LIMITS.image.mimes as readonly string[]).includes(mime)) return "IMAGE";
  if ((MEDIA_LIMITS.video.mimes as readonly string[]).includes(mime)) return "VIDEO";
  if ((MEDIA_LIMITS.document.mimes as readonly string[]).includes(mime)) return "DOCUMENT";
  return null;
}

/** Decides what a file really is from its bytes. The client-supplied name, extension and type are never trusted. */
export async function inspectUpload(buffer: Buffer, clientName: string): Promise<InspectedFile> {
  if (buffer.length === 0) throw Errors.upload("The file is empty");

  const detected = await fileTypeFromBuffer(buffer);
  let mime = detected?.mime;
  let ext = detected?.ext;

  if (!mime) {
    // SVG and other text formats have no magic number: accept SVG only, by content.
    const looksSvg = /\.svg$/i.test(clientName) && buffer.length <= SVG_MAX_BYTES;
    if (looksSvg && isSafeSvg(buffer.toString("utf8"))) {
      mime = "image/svg+xml";
      ext = "svg";
    } else if (looksSvg) {
      throw Errors.upload("This SVG contains scripts, external links or other unsafe content and was rejected");
    }
  }

  if (!mime || !ext) throw Errors.upload("Unsupported file type. Use JPEG, PNG, WebP, AVIF, GIF, SVG, MP4, WebM or PDF");
  const kind = kindOfMime(mime);
  if (!kind) throw Errors.upload(`Files of type ${mime} are not allowed`);

  const limit = kind === "IMAGE" ? MEDIA_LIMITS.image : kind === "VIDEO" ? MEDIA_LIMITS.video : MEDIA_LIMITS.document;
  if (buffer.length > limit.maxBytes) {
    throw Errors.upload(`The file is too large. The limit for this type is ${Math.round(limit.maxBytes / 1024 / 1024)} MB`, 413);
  }

  let width: number | null = null;
  let height: number | null = null;
  if (kind === "IMAGE") {
    try {
      const dim = imageSize(buffer);
      width = dim.width ?? null;
      height = dim.height ?? null;
    } catch {
      throw Errors.upload("The image could not be read. It may be corrupted");
    }
  }
  return { mime, ext: ext === "jpg" ? "jpg" : ext, kind, width, height };
}

/** File name for display only: no path, no control characters, bounded length. */
export function sanitizeDisplayName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "file";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim();
  return (cleaned || "file").slice(0, 200);
}

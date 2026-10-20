import { describe, expect, it } from "vitest";
import { getStorage, absoluteMediaUrl } from "../src/common/storage/storage.js";
import { inspectUpload, isSafeSvg, sanitizeDisplayName } from "../src/modules/media/upload-validation.js";

// 1x1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const svg = (body: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${body}</svg>`);

describe("upload inspection uses the real file content", () => {
  it("accepts a PNG and reads its size", async () => {
    const info = await inspectUpload(PNG, "photo.png");
    expect(info).toMatchObject({ mime: "image/png", kind: "IMAGE", width: 1, height: 1, ext: "png" });
  });

  it("ignores a lying extension: a PNG named .exe is still a PNG", async () => {
    expect((await inspectUpload(PNG, "totally-safe.exe")).mime).toBe("image/png");
  });

  it("rejects executables even if renamed to an image", async () => {
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200, 1)]);
    await expect(inspectUpload(exe, "logo.png")).rejects.toMatchObject({ code: "UPLOAD_ERROR" });
  });

  it("rejects HTML or script disguised as an image", async () => {
    await expect(inspectUpload(Buffer.from("<html><script>alert(1)</script></html>"), "x.png")).rejects.toMatchObject({ code: "UPLOAD_ERROR" });
    await expect(inspectUpload(Buffer.from("<?php system($_GET['c']); ?>"), "x.jpg")).rejects.toMatchObject({ code: "UPLOAD_ERROR" });
  });

  it("rejects empty files", async () => {
    await expect(inspectUpload(Buffer.alloc(0), "empty.png")).rejects.toMatchObject({ message: "The file is empty" });
  });

  it("accepts plain SVG drawings only", async () => {
    const ok = await inspectUpload(svg('<circle cx="5" cy="5" r="4" fill="#000"/>'), "mark.svg");
    expect(ok).toMatchObject({ mime: "image/svg+xml", kind: "IMAGE" });
  });
});

describe("SVG safety", () => {
  const unsafe: [string, string][] = [
    ["script tag", "<script>alert(1)</script>"],
    ["event handler", '<rect onload="alert(1)" width="1" height="1"/>'],
    ["javascript url", '<a href="javascript:alert(1)"><rect width="1" height="1"/></a>'],
    ["foreignObject", "<foreignObject><div>hi</div></foreignObject>"],
    ["external image", '<image href="https://evil.example/x.png"/>'],
    ["external xlink", '<use xlink:href="https://evil.example/x.svg#a"/>'],
    ["css url()", '<rect style="fill:url(https://evil.example/x)"/>'],
    ["entity", '<!DOCTYPE svg [<!ENTITY x "y">]><rect/>'],
    ["iframe", "<iframe src='x'></iframe>"],
  ];
  for (const [name, body] of unsafe) {
    it(`rejects ${name}`, () => {
      expect(isSafeSvg(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`)).toBe(false);
    });
  }

  it("allows internal fragment references", () => {
    expect(isSafeSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="p" d="M0 0"/></defs><use href="#p"/></svg>')).toBe(true);
  });

  it("surfaces a clear error when an unsafe SVG is uploaded", async () => {
    await expect(inspectUpload(svg("<script>alert(1)</script>"), "evil.svg")).rejects.toMatchObject({ message: expect.stringContaining("unsafe") });
  });
});

describe("storage", () => {
  it("refuses keys that try to leave the upload folder", async () => {
    const storage = getStorage();
    for (const key of ["../outside.png", "..\\outside.png", "a/../../b.png", "/etc/passwd", "a//b.png", "", "a b.png", "..%2f..%2fx"]) {
      await expect(storage.put(key, Buffer.from("x"), "image/png"), key).rejects.toMatchObject({ code: "UPLOAD_ERROR" });
      await expect(storage.remove(key), key).rejects.toMatchObject({ code: "UPLOAD_ERROR" });
    }
  });

  it("builds absolute URLs for local files and leaves remote URLs alone", () => {
    expect(absoluteMediaUrl("/media/2026/10/x.png")).toBe("http://localhost:4000/media/2026/10/x.png");
    expect(absoluteMediaUrl("https://cdn.example/x.png")).toBe("https://cdn.example/x.png");
    expect(absoluteMediaUrl(null)).toBeNull();
  });
});

describe("display names", () => {
  it("strips paths and control characters", () => {
    expect(sanitizeDisplayName("..\\..\\windows\\evil<>.png")).toBe("evil.png");
    expect(sanitizeDisplayName("/etc/passwd")).toBe("passwd");
    expect(sanitizeDisplayName("a\u0000b\u001fc.png")).toBe("abc.png");
    expect(sanitizeDisplayName("   ")).toBe("file");
    expect(sanitizeDisplayName("x".repeat(500)).length).toBe(200);
  });
});

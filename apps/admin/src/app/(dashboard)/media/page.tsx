"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, ImageOff, Search, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import type { MediaDto } from "@portfolio/types";
import { acceptAttr, MediaThumb, useUpload } from "@/components/forms/media-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge, EmptyState, ErrorState, Field, PageHeader, Pagination, Skeleton } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatBytes, formatDate } from "@/lib/utils";

export default function MediaPage() {
  const { canEdit } = useAuth();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [unused, setUnused] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaDto | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, busy } = useUpload();

  const list = useQuery({
    queryKey: ["media", "library", q, kind, unused, page],
    queryFn: () => api.media.list({ q: q || undefined, kind: kind || undefined, unused: unused || undefined, page, pageSize: 24, sort: "createdAt", order: "desc" }),
  });

  async function uploadAll(files: FileList | File[]) {
    for (const f of Array.from(files)) await upload(f);
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (canEdit && e.dataTransfer.files.length) void uploadAll(e.dataTransfer.files);
  };

  return (
    <>
      <PageHeader
        title="Media library"
        description="Every image, video and PDF used on the website. A file that is still in use cannot be deleted."
        actions={
          canEdit && (
            <>
              <input ref={fileRef} type="file" multiple hidden accept={acceptAttr("any")} onChange={(e) => (e.target.files && void uploadAll(e.target.files), (e.target.value = ""))} />
              <Button loading={busy} onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" aria-hidden="true" />
                Upload files
              </Button>
            </>
          )
        }
      />

      <div
        onDragOver={(e) => (e.preventDefault(), canEdit && setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn("card overflow-hidden transition-shadow", dragging && "ring-2 ring-ink")}
      >
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden="true" />
            <Input aria-label="Search media" placeholder="Search by name, title or alt text" className="pl-9" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          </div>
          <Select aria-label="File type" className="sm:w-44" value={kind} onChange={(e) => (setKind(e.target.value), setPage(1))}>
            <option value="">All types</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
            <option value="DOCUMENT">Documents</option>
          </Select>
          <label className="flex items-center gap-2 px-1 text-sm">
            <input type="checkbox" className="size-4 accent-black" checked={unused} onChange={(e) => (setUnused(e.target.checked), setPage(1))} />
            Unused only
          </label>
        </div>

        {list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.isLoading ? (
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : list.data && list.data.items.length > 0 ? (
          <>
            <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {list.data.items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setSelected(m)} className="group block w-full overflow-hidden rounded-xl bg-card text-left shadow-[inset_0_0_0_1px_var(--line-2)] transition hover:shadow-[inset_0_0_0_2px_var(--ink)]">
                    <span className="relative block aspect-square overflow-hidden bg-soft">
                      <MediaThumb media={m} />
                      {m.usageCount === 0 && <Badge className="absolute left-2 top-2" tone="warn">Unused</Badge>}
                    </span>
                    <span className="block px-3 py-2.5">
                      <span className="block truncate text-sm font-medium">{m.title || m.originalName}</span>
                      <span className="block text-xs text-mute">
                        {m.kind.toLowerCase()} · {formatBytes(m.fileSize)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} onPage={setPage} />
          </>
        ) : (
          <EmptyState
            icon={<ImageOff className="size-5" />}
            title={q || kind || unused ? "No files match your filters" : "Your library is empty"}
            description={canEdit ? "Drag files here or use Upload files. Images up to 8 MB, videos up to 80 MB, PDFs up to 15 MB." : "No files have been uploaded yet."}
          />
        )}
      </div>

      {selected && <MediaDetail media={selected} canEdit={canEdit} onClose={() => setSelected(null)} onChanged={(m) => setSelected(m)} />}
    </>
  );
}

function MediaDetail({ media, canEdit, onClose, onChanged }: { media: MediaDto; canEdit: boolean; onClose: () => void; onChanged: (m: MediaDto) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(media.title ?? "");
  const [alt, setAlt] = useState(media.altText ?? "");
  const [altAr, setAltAr] = useState(media.altTextAr ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [blocked, setBlocked] = useState<{ usedAs: string; count: number }[] | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const dirty = title !== (media.title ?? "") || alt !== (media.altText ?? "") || altAr !== (media.altTextAr ?? "");

  const usage = useQuery({ queryKey: ["media", "usage", media.id], queryFn: () => api.media.usage(media.id) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["media"] });

  const save = useMutation({
    mutationFn: () => api.media.updateMeta(media.id, { title, altText: alt, altTextAr: altAr }),
    onSuccess: (m) => (toast.success("Details saved"), onChanged(m), refresh()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const replace = useMutation({
    mutationFn: (f: File) => api.media.replace(media.id, f),
    onSuccess: (m) => (toast.success("File replaced. Everything that uses it now shows the new file"), onChanged(m), refresh()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => api.media.remove(media.id),
    onSuccess: () => (toast.success("File deleted"), refresh(), onClose()),
    onError: (e) => {
      setConfirmDelete(false);
      if (e instanceof ApiError && e.code === "CONFLICT") setBlocked(e.details as { usedAs: string; count: number }[]);
      else toast.error(errorMessage(e));
    },
  });

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent title={media.title || media.originalName} description={`${media.kind.toLowerCase()} · ${media.mimeType}`} size="lg">
          <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
            <div>
              <div className="overflow-hidden rounded-xl bg-soft">
                {media.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.publicUrl} alt={media.altText ?? ""} className="max-h-[360px] w-full object-contain" />
                ) : media.kind === "VIDEO" ? (
                  <video src={media.publicUrl} controls preload="metadata" className="max-h-[360px] w-full" aria-label={media.title || media.originalName} />
                ) : (
                  <a href={media.publicUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 px-6 py-16 text-sm hover:underline">
                    <FileText className="size-8 text-mute" aria-hidden="true" />
                    Open the document
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-mute">Original name</dt>
                <dd className="truncate">{media.originalName}</dd>
                <dt className="text-mute">Size</dt>
                <dd>{formatBytes(media.fileSize)}</dd>
                {media.width && (
                  <>
                    <dt className="text-mute">Dimensions</dt>
                    <dd>
                      {media.width} × {media.height}
                    </dd>
                  </>
                )}
                <dt className="text-mute">Uploaded</dt>
                <dd>{formatDate(media.createdAt, true)}</dd>
                <dt className="text-mute">Storage</dt>
                <dd>{media.storageProvider === "LOCAL" ? "Local disk" : "Object storage"}</dd>
              </dl>
              <div className="mt-3 flex gap-2">
                <Input readOnly aria-label="File address" value={media.publicUrl} className="h-9 text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(media.publicUrl);
                      toast.success("Address copied");
                    } catch {
                      toast.error("Could not copy. Select the address and copy it manually");
                    }
                  }}
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Display title" htmlFor="m-title">
                <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} maxLength={255} />
              </Field>
              <Field label="Alt text (English)" htmlFor="m-alt" description="Describe the image for people who cannot see it. Leave empty for purely decorative images.">
                <Textarea id="m-alt" rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} disabled={!canEdit} maxLength={300} />
              </Field>
              <Field label="Alt text (العربية)" htmlFor="m-alt-ar">
                <Textarea id="m-alt-ar" rows={2} dir="rtl" lang="ar" value={altAr} onChange={(e) => setAltAr(e.target.value)} disabled={!canEdit} maxLength={300} />
              </Field>

              <div>
                <h3 className="text-sm font-medium">Where it is used</h3>
                {usage.isLoading ? (
                  <Skeleton className="mt-2 h-5 w-40" />
                ) : usage.data && usage.data.length > 0 ? (
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {usage.data.map((u) => (
                      <li key={u.usedAs}>
                        {u.usedAs} {u.count > 1 && <span className="text-mute">×{u.count}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-mute">Not used anywhere. It is safe to delete.</p>
                )}
              </div>
            </div>
          </div>

          {canEdit && (
            <DialogFooter className="mt-6 sm:justify-between">
              <div className="flex gap-2">
                <input ref={replaceRef} type="file" hidden accept={acceptAttr(media.kind === "IMAGE" ? "image" : media.kind === "VIDEO" ? "video" : "document")} onChange={(e) => (e.target.files?.[0] && replace.mutate(e.target.files[0]), (e.target.value = ""))} />
                <Button variant="outline" loading={replace.isPending} onClick={() => replaceRef.current?.click()}>
                  Replace file
                </Button>
                <Button variant="ghost" className="text-danger hover:bg-danger-bg" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </div>
              <Button loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
                Save details
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={confirmDelete} title="Delete this file?" description="The file is removed from storage permanently. This only works when no content uses it." confirmLabel="Delete file" destructive loading={del.isPending} onCancel={() => setConfirmDelete(false)} onConfirm={() => del.mutate()} />

      <Dialog open={!!blocked} onOpenChange={(o) => !o && setBlocked(null)}>
        <DialogContent title="This file is still in use" description="Remove it from the places below first, then try again." size="sm">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {blocked?.map((u) => (
              <li key={u.usedAs}>
                {u.usedAs} {u.count > 1 && `×${u.count}`}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setBlocked(null)}>Understood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

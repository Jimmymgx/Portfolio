"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Film, ImageOff, Search, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type { MediaDto } from "@portfolio/types";
import { MEDIA_LIMITS } from "@portfolio/validation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Pagination, Skeleton } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";

export type Accept = "image" | "video" | "document" | "any";

const KIND: Record<Accept, "IMAGE" | "VIDEO" | "DOCUMENT" | undefined> = { image: "IMAGE", video: "VIDEO", document: "DOCUMENT", any: undefined };

export const acceptAttr = (a: Accept) =>
  (a === "any" ? [...MEDIA_LIMITS.image.mimes, ...MEDIA_LIMITS.video.mimes, ...MEDIA_LIMITS.document.mimes] : MEDIA_LIMITS[a === "image" ? "image" : a === "video" ? "video" : "document"].mimes).join(",");

export const maxBytesFor = (a: Accept) => (a === "video" ? MEDIA_LIMITS.video.maxBytes : a === "document" ? MEDIA_LIMITS.document.maxBytes : a === "image" ? MEDIA_LIMITS.image.maxBytes : MEDIA_LIMITS.video.maxBytes);

export function MediaThumb({ media, className }: { media: Pick<MediaDto, "kind" | "publicUrl" | "altText" | "originalName">; className?: string }) {
  if (media.kind === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.publicUrl} alt={media.altText ?? ""} loading="lazy" className={cn("size-full object-cover", className)} />;
  }
  const Icon = media.kind === "VIDEO" ? Film : FileText;
  return (
    <div className={cn("grid size-full place-items-center bg-soft text-mute", className)} aria-hidden="true">
      <Icon className="size-7" />
    </div>
  );
}

/** Uploads one file and reports the result. Shared by the picker and the library page. */
export function useUpload() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function upload(file: File, accept: Accept = "any"): Promise<MediaDto | null> {
    if (file.size > maxBytesFor(accept) && accept !== "any") {
      toast.error(`${file.name} is larger than ${formatBytes(maxBytesFor(accept))}`);
      return null;
    }
    setBusy(true);
    try {
      const { media, message } = await api.media.upload(file);
      toast.success(message);
      await qc.invalidateQueries({ queryKey: ["media"] });
      return media;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { upload, busy };
}

export function MediaPickerDialog({ open, onOpenChange, accept, onSelect }: { open: boolean; onOpenChange: (o: boolean) => void; accept: Accept; onSelect: (m: MediaDto) => void }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, busy } = useUpload();

  const list = useQuery({
    queryKey: ["media", "picker", accept, q, page],
    queryFn: () => api.media.list({ kind: KIND[accept], q: q || undefined, page, pageSize: 24, sort: "createdAt", order: "desc" }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Choose a file" description="Pick from your library or upload a new file." size="xl">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden="true" />
            <Input aria-label="Search media" placeholder="Search by name or alt text" className="pl-9" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept={acceptAttr(accept)}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const media = await upload(f, accept);
              if (media) {
                onSelect(media);
                onOpenChange(false);
              }
            }}
          />
          <Button variant="outline" loading={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" aria-hidden="true" />
            Upload new
          </Button>
        </div>

        {list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : list.data && list.data.items.length > 0 ? (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {list.data.items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(m);
                      onOpenChange(false);
                    }}
                    className="group block w-full overflow-hidden rounded-xl bg-card text-left shadow-[inset_0_0_0_1px_var(--line-2)] transition hover:shadow-[inset_0_0_0_2px_var(--ink)]"
                  >
                    <span className="block aspect-square overflow-hidden bg-soft">
                      <MediaThumb media={m} />
                    </span>
                    <span className="block truncate px-2.5 py-2 text-xs font-medium">{m.title || m.originalName}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} onPage={setPage} />
          </>
        ) : (
          <EmptyState title="No files found" description="Upload a file to get started." icon={<ImageOff className="size-5" />} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A form field holding a media id. Shows a preview, opens the picker, and can be cleared. */
export function MediaField({ name, label, accept, description, disabled }: { name: string; label: string; accept: Accept; description?: string; disabled?: boolean }) {
  const { control } = useFormContext();
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <MediaFieldInner id={name} label={label} accept={accept} description={description} disabled={disabled} value={(field.value as number | null) ?? null} onChange={field.onChange} open={open} setOpen={setOpen} />}
    />
  );
}

function MediaFieldInner({ id, label, accept, description, disabled, value, onChange, open, setOpen }: { id: string; label: string; accept: Accept; description?: string; disabled?: boolean; value: number | null; onChange: (v: number | null) => void; open: boolean; setOpen: (o: boolean) => void }) {
  const media = useQuery({ queryKey: ["media", value], queryFn: () => api.media.get(value!), enabled: !!value, staleTime: 60_000 });

  return (
    <div className="space-y-1.5">
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <div className="flex items-center gap-3 rounded-xl bg-card p-2.5 shadow-[inset_0_0_0_1px_var(--line-2)]">
        <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-soft">
          {value && media.data ? <MediaThumb media={media.data} /> : value && media.isLoading ? <Skeleton className="size-full" /> : <div className="grid size-full place-items-center text-mute" aria-hidden="true"><ImageOff className="size-5" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value ? (media.data ? media.data.title || media.data.originalName : "Loading…") : "No file selected"}</p>
          {media.data && (
            <p className="text-xs text-mute">
              {media.data.kind.toLowerCase()} · {formatBytes(media.data.fileSize)}
              {media.data.width ? ` · ${media.data.width}×${media.data.height}` : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)} aria-label={`${value ? "Change" : "Choose"} ${label}`} id={id}>
            {value ? "Change" : "Choose"}
          </Button>
          {value && (
            <Button size="iconSm" variant="ghost" disabled={disabled} onClick={() => onChange(null)} aria-label={`Remove ${label}`}>
              <X className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {description && <p className="text-xs text-mute">{description}</p>}
      <MediaPickerDialog open={open} onOpenChange={setOpen} accept={accept} onSelect={(m) => onChange(m.id)} />
    </div>
  );
}

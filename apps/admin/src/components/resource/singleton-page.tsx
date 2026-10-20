"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ZodType } from "zod";
import type { Singleton } from "@portfolio/api-client";
import { FieldGrid, makeResolver, normalizeValues, toFormValues, type FieldDef } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, ErrorState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useUnsavedChanges } from "@/lib/unsaved";
import { formatDate } from "@/lib/utils";

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface FieldGroup {
  title: string;
  description?: string;
  fields: FieldDef[];
}

interface Props {
  /** Unique key, also used for the unsaved-changes guard. */
  id: string;
  title: string;
  description?: string;
  client: Singleton;
  groups: FieldGroup[];
  /** Schema of the full set of fields. */
  schema: ZodType;
  defaults?: Rec;
  /** Extra content under the form, given the record being edited. */
  below?: (record: Rec | null) => ReactNode;
  /** Path on the public site to open for the draft preview. */
  previewPath?: string;
  /** Hides the publish workflow (for example when everything is live immediately). */
  note?: ReactNode;
  /** Used inside tabs: no page header. */
  embedded?: boolean;
}

export function SingletonPage({ id, title, description, client, groups, schema, defaults = {}, below, previewPath = "/", note, embedded }: Props) {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const fields = useMemo(() => groups.flatMap((g) => g.fields), [groups]);
  const key = ["singleton", id];

  const q = useQuery({ queryKey: key, queryFn: () => client.get() });
  const record = (q.data?.draft ?? q.data?.published ?? null) as Rec | null;

  const form = useForm<Rec>({
    defaultValues: toFormValues(null, fields, defaults),
    resolver: makeResolver(schema, fields),
  });
  const { isDirty } = form.formState;
  useUnsavedChanges(`singleton-${id}`, isDirty);

  // Load the record into the form once it arrives (and again after save, publish or discard).
  useEffect(() => {
    if (q.data) form.reset(toFormValues(record, fields, defaults));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const [confirm, setConfirm] = useState<null | "publish" | "discard">(null);

  const applyServerErrors = (e: unknown) => {
    if (e instanceof ApiError && e.code === "VALIDATION_ERROR") {
      Object.entries(e.fieldErrors).forEach(([path, message]) => form.setError(path as never, { message }));
      toast.error(Object.keys(e.fieldErrors).length ? "Please fix the highlighted fields" : e.message);
    } else toast.error(errorMessage(e));
  };

  const save = useMutation({
    mutationFn: (values: Rec) => client.save(normalizeValues(values, fields)),
    onSuccess: (dto) => qc.setQueryData(key, dto),
    onError: applyServerErrors,
  });

  const publish = useMutation({
    mutationFn: async (values: Rec | null) => {
      if (values) qc.setQueryData(key, await client.save(normalizeValues(values, fields)));
      return client.publish();
    },
    onSuccess: (dto) => {
      qc.setQueryData(key, dto);
      toast.success(`${title} published. The website will update in a moment`);
      setConfirm(null);
    },
    onError: (e) => {
      setConfirm(null);
      applyServerErrors(e);
    },
  });

  const discard = useMutation({
    mutationFn: () => client.discard(),
    onSuccess: (dto) => {
      qc.setQueryData(key, dto);
      toast.success("Unpublished changes were discarded");
      setConfirm(null);
    },
    onError: (e) => (setConfirm(null), toast.error(errorMessage(e))),
  });

  async function openPreview() {
    try {
      const { url } = await api.previewLink("en", previewPath);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const published = q.data?.published;
  const hasChanges = q.data?.hasUnpublishedChanges;
  const state = !q.data ? null : !published ? { tone: "warn" as const, text: "Not published yet" } : hasChanges || isDirty ? { tone: "warn" as const, text: "Has unpublished changes" } : { tone: "ok" as const, text: "Live and up to date" };

  return (
    <>
      {embedded ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-sm text-mute">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {state && <Badge tone={state.tone}>{state.text}</Badge>}
            {canEdit && (
              <Button variant="outline" onClick={openPreview}>
                <ExternalLink className="size-4" aria-hidden="true" />
                Preview
              </Button>
            )}
          </div>
        </div>
      ) : (
        <PageHeader
          title={title}
          description={description}
          actions={
            <>
              {state && <Badge tone={state.tone}>{state.text}</Badge>}
              {canEdit && (
                <Button variant="outline" onClick={openPreview}>
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Preview
                </Button>
              )}
            </>
          }
        />
      )}
      {note}

      {q.isError ? (
        <div className="card">
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        </div>
      ) : q.isLoading ? (
        <div className="card space-y-4 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit((v) => save.mutate(v, { onSuccess: () => toast.success("Draft saved. The live website is unchanged until you publish") }))}
            noValidate
            className="space-y-6"
          >
            {groups.map((g) => (
              <section key={g.title} className="card p-6" aria-labelledby={`${id}-${g.title}`}>
                <h2 id={`${id}-${g.title}`} className="text-base font-semibold">
                  {g.title}
                </h2>
                {g.description && <p className="mb-4 mt-0.5 text-sm text-mute">{g.description}</p>}
                <div className={g.description ? "" : "mt-4"}>
                  <FieldGrid fields={g.fields} disabled={!canEdit} idPrefix={id} />
                </div>
              </section>
            ))}

            {below?.(record)}

            {canEdit && (
              <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card/95 p-3 shadow-lg ring-1 ring-black/10 backdrop-blur">
                <p className="px-2 text-sm text-mute" aria-live="polite">
                  {isDirty ? "You have unsaved edits." : published ? `Last published ${formatDate(published.updatedAt, true)}${published.updatedByName ? ` by ${published.updatedByName}` : ""}` : "Nothing is public yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(hasChanges || isDirty) && published && (
                    <Button variant="ghost" onClick={() => setConfirm("discard")}>
                      Discard changes
                    </Button>
                  )}
                  <Button type="submit" variant="outline" loading={save.isPending} disabled={!isDirty}>
                    Save draft
                  </Button>
                  <Button disabled={!isDirty && !hasChanges && !!published} loading={publish.isPending} onClick={form.handleSubmit(() => setConfirm("publish"))}>
                    Publish
                  </Button>
                </div>
              </div>
            )}
          </form>
        </FormProvider>
      )}

      <ConfirmDialog
        open={confirm === "publish"}
        title={`Publish ${title.toLowerCase()}?`}
        description="Your changes become visible on the public website."
        confirmLabel="Publish"
        loading={publish.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => publish.mutate(isDirty ? form.getValues() : null)}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        title="Discard unpublished changes?"
        description="Your draft will be replaced by the version that is live now."
        confirmLabel="Discard"
        destructive
        loading={discard.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => discard.mutate()}
      />
    </>
  );
}

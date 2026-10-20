"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, ImageOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PROJECT_STAGES, projectCreate, projectUpdate } from "@portfolio/validation";
import { FieldGrid, makeResolver, normalizeValues, toFormValues, type FieldDef } from "@/components/forms/fields";
import { ResourcePage } from "@/components/resource/resource-page";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, ErrorState, Skeleton, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useUnsavedChanges } from "@/lib/unsaved";
import { formatDate, titleCase } from "@/lib/utils";
import { projectFeatureCreate, projectFeatureUpdate, projectMediaCreate, projectMediaUpdate } from "@portfolio/validation";

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const DEFAULTS = { stage: "COMPLETED", featured: false, status: "DRAFT", skillIds: [] };

export function ProjectEditor({ id }: { id?: number }) {
  const isNew = id === undefined;
  const router = useRouter();
  const qc = useQueryClient();
  const { canEdit } = useAuth();
  const [tab, setTab] = useState("general");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = useQuery({ queryKey: ["project", id], queryFn: () => api.projects.get(id!), enabled: !isNew });
  const cats = useQuery({ queryKey: ["options", "projectCategories"], queryFn: async () => (await api.projectCategories.list({ pageSize: 100, sort: "sortOrder" })).items });

  const tabs: { value: string; label: string; fields: FieldDef[] }[] = useMemo(
    () => [
      {
        value: "general",
        label: "General",
        fields: [
          { kind: "text", name: "title", label: "Title", bilingual: true, required: true },
          { kind: "slug", name: "slug", label: "Slug", description: "The project's web address part. Leave empty to generate it from the title." },
          { kind: "select", name: "categoryId", label: "Category", required: true, numeric: true, options: (cats.data ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
          { kind: "textarea", name: "shortDescription", label: "Short description", bilingual: true, rows: 3, max: 600, description: "Shown in the expanded gallery panel." },
          { kind: "textarea", name: "fullDescription", label: "Full description", bilingual: true, rows: 8 },
        ],
      },
      {
        value: "details",
        label: "Details",
        fields: [
          { kind: "textarea", name: "problemStatement", label: "Problem solved", bilingual: true, rows: 4 },
          { kind: "textarea", name: "solution", label: "Solution", bilingual: true, rows: 4 },
          { kind: "text", name: "role", label: "Your role", bilingual: true },
          { kind: "select", name: "stage", label: "Project status", required: true, options: PROJECT_STAGES.map((s) => ({ value: s, label: titleCase(s) })), description: "Where the project stands today. This is separate from publishing." },
        ],
      },
      {
        value: "technologies",
        label: "Technologies",
        fields: [
          {
            kind: "multi",
            name: "skillIds",
            label: "Technologies used",
            queryKey: "skills-all",
            description: "Chosen from your Skills. Add a skill there first if it is missing.",
            load: async () => (await api.skills.list({ pageSize: 100, sort: "name" })).items.map((s) => ({ value: s.id as number, label: s.name as string })),
          },
        ],
      },
      {
        value: "links",
        label: "Links",
        fields: [
          { kind: "url", name: "liveUrl", label: "Live website" },
          { kind: "url", name: "repositoryUrl", label: "Repository", description: "Only add this if the code is public." },
        ],
      },
      {
        value: "publishing",
        label: "Publishing",
        fields: [
          {
            kind: "select",
            name: "status",
            label: "Visibility",
            required: true,
            options: [
              { value: "DRAFT", label: "Draft (private)" },
              { value: "PUBLISHED", label: "Published (visible on the website)" },
              { value: "UNPUBLISHED", label: "Unpublished (hidden)" },
            ],
          },
          { kind: "switch", name: "featured", label: "Featured project", description: "Marks the project as a highlight." },
        ],
      },
      {
        value: "seo",
        label: "SEO",
        fields: [
          { kind: "text", name: "seoTitle", label: "SEO title", bilingual: true, max: 200 },
          { kind: "textarea", name: "seoDescription", label: "SEO description", bilingual: true, rows: 3, max: 500 },
          { kind: "url", name: "canonicalUrl", label: "Canonical URL", wide: true },
          { kind: "media", name: "ogImageMediaId", label: "Social sharing image", accept: "image", wide: true },
        ],
      },
    ],
    [cats.data],
  );
  const allFields = useMemo(() => tabs.flatMap((t) => t.fields), [tabs]);

  const form = useForm<Rec>({
    defaultValues: toFormValues(null, allFields, DEFAULTS),
    resolver: makeResolver(isNew ? projectCreate : projectUpdate, allFields),
  });
  const { isDirty, errors } = form.formState;
  useUnsavedChanges(`project-${id ?? "new"}`, isDirty);

  useEffect(() => {
    if (project.data) form.reset(toFormValues(project.data, allFields, DEFAULTS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.data, cats.data]);

  const applyErrors = (e: unknown) => {
    if (e instanceof ApiError && e.code === "VALIDATION_ERROR") {
      Object.entries(e.fieldErrors).forEach(([path, message]) => form.setError(path as never, { message }));
      toast.error("Please fix the highlighted fields");
    } else toast.error(errorMessage(e));
  };

  const save = useMutation({
    mutationFn: async (values: Rec) => {
      const body = normalizeValues(values, allFields);
      return isNew ? api.projects.create(body) : api.projects.update(id!, body);
    },
    onSuccess: (saved) => {
      toast.success(isNew ? "Project created" : "Project saved");
      qc.invalidateQueries({ queryKey: ["list", "projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (isNew) {
        form.reset(form.getValues());
        router.replace(`/projects/${saved.id}`);
      } else {
        qc.setQueryData(["project", id], saved);
        form.reset(toFormValues(saved, allFields, DEFAULTS));
      }
    },
    onError: applyErrors,
  });

  const toggle = useMutation({
    mutationFn: (publish: boolean) => (publish ? api.projects.publish(id!) : api.projects.unpublish(id!)),
    onSuccess: (saved, publish) => {
      toast.success(publish ? "Project published. The website will update in a moment" : "Project unpublished");
      qc.setQueryData(["project", id], saved);
      qc.invalidateQueries({ queryKey: ["list", "projects"] });
      form.reset(toFormValues(saved, allFields, DEFAULTS));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const del = useMutation({
    mutationFn: () => api.projects.remove(id!),
    onSuccess: () => {
      form.reset();
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["list", "projects"] });
      router.replace("/projects");
    },
    onError: (e) => (toast.error(errorMessage(e)), setConfirmDelete(false)),
  });

  async function preview() {
    try {
      const { url } = await api.previewLink("en", "/#work");
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const tabHasError = (fields: FieldDef[]) => fields.some((f) => f.name in errors || `${f.name}Ar` in errors);
  const data = project.data as Rec | undefined;

  if (!isNew && project.isError)
    return (
      <div className="card">
        <ErrorState message={errorMessage(project.error)} onRetry={() => project.refetch()} />
      </div>
    );

  return (
    <>
      <div className="mb-6">
        <Link href="/projects" className="mb-3 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All projects
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-soft text-mute" aria-hidden="true">
              {data?.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.coverUrl} alt="" className="size-full object-cover" />
              ) : (
                <ImageOff className="size-5" />
              )}
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "New project" : (data?.title ?? "Loading…")}</h1>
              {data && (
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-mute">
                  <StatusBadge status={data.status} />
                  {data.featured && <Badge tone="dark">Featured</Badge>}
                  <span>Updated {formatDate(data.updatedAt, true)}{data.updatedByName ? ` by ${data.updatedByName}` : ""}</span>
                  {data.publishedAt && <span>· Published {formatDate(data.publishedAt)}</span>}
                </p>
              )}
            </div>
          </div>
          {!isNew && canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={preview}>
                <ExternalLink className="size-4" aria-hidden="true" />
                Preview
              </Button>
              {data?.status === "PUBLISHED" ? (
                <Button variant="outline" loading={toggle.isPending} disabled={isDirty} onClick={() => toggle.mutate(false)}>
                  Unpublish
                </Button>
              ) : (
                <Button loading={toggle.isPending} disabled={isDirty} onClick={() => toggle.mutate(true)} title={isDirty ? "Save your changes first" : undefined}>
                  Publish
                </Button>
              )}
              <Button variant="ghost" className="text-danger hover:bg-danger-bg" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isNew && project.isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <FormProvider {...form}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList aria-label="Project sections">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                  {tabHasError(t.fields) && <span className="ml-1.5 inline-block size-2 rounded-full bg-danger align-middle" aria-label="has errors" />}
                </TabsTrigger>
              ))}
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>

            {tabs.map((t) => (
              <TabsContent key={t.value} value={t.value} forceMount hidden={tab !== t.value}>
                <section className="card p-6" aria-label={t.label}>
                  <FieldGrid fields={t.fields} disabled={!canEdit} idPrefix="proj" />
                  {t.value === "publishing" && data?.publishedAt && <p className="mt-4 text-sm text-mute">First published on {formatDate(data.publishedAt, true)}.</p>}
                </section>
              </TabsContent>
            ))}

            <TabsContent value="features">
              {isNew ? (
                <div className="card p-6 text-sm text-mute">Save the project first, then add its key features here.</div>
              ) : (
                <ResourcePage
                  embedded
                  title="Key features"
                  description="Short points shown in the expanded gallery panel."
                  resource="projectFeatures"
                  singular="feature"
                  reorderable
                  searchable={false}
                  fixedParams={{ projectId: id! }}
                  extraBody={() => ({ projectId: id! })}
                  createSchema={projectFeatureCreate}
                  updateSchema={projectFeatureUpdate}
                  rowTitle={(r) => r.title}
                  columns={[
                    { header: "Feature", cell: (r) => r.title },
                    { header: "Description", cell: (r) => r.description || "-", hideOnMobile: true },
                  ]}
                  fields={[
                    { kind: "text", name: "title", label: "Feature", bilingual: true, required: true },
                    { kind: "text", name: "description", label: "Detail", bilingual: true },
                  ]}
                />
              )}
            </TabsContent>

            <TabsContent value="media">
              {isNew ? (
                <div className="card p-6 text-sm text-mute">Save the project first, then add screenshots here.</div>
              ) : (
                <ResourcePage
                  embedded
                  title="Images"
                  description="Real screenshots or illustrations. The cover image is shown in the gallery. Mark images that are illustrations so the site labels them honestly."
                  resource="projectMedia"
                  singular="image"
                  reorderable
                  searchable={false}
                  fixedParams={{ projectId: id! }}
                  extraBody={() => ({ projectId: id! })}
                  createSchema={projectMediaCreate}
                  updateSchema={projectMediaUpdate}
                  rowTitle={(r) => r.caption || r.url || `Image ${r.id}`}
                  columns={[
                    {
                      header: "Image",
                      cell: (r) => (
                        <span className="flex items-center gap-3">
                          <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-soft">
                            {r.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.url} alt={r.alt ?? ""} className="size-full object-cover" loading="lazy" />
                            ) : null}
                          </span>
                          <span className="text-sm font-normal text-mute">{r.caption || "No caption"}</span>
                        </span>
                      ),
                    },
                    { header: "Role", hideOnMobile: true, cell: (r) => (<span className="flex gap-1">{r.isCover && <Badge tone="dark">Cover</Badge>}{r.isIllustrative && <Badge tone="warn">Illustration</Badge>}{!r.isCover && !r.isIllustrative && "-"}</span>) },
                  ]}
                  defaults={{ isCover: false, isIllustrative: false }}
                  fields={[
                    { kind: "media", name: "mediaId", label: "Image", accept: "image", wide: true },
                    { kind: "text", name: "caption", label: "Caption", bilingual: true },
                    { kind: "switch", name: "isCover", label: "Use as cover image", wide: true },
                    { kind: "switch", name: "isIllustrative", label: "This is an illustration, not a real screenshot", wide: true },
                  ]}
                  editFields={[
                    { kind: "text", name: "caption", label: "Caption", bilingual: true },
                    { kind: "switch", name: "isCover", label: "Use as cover image", wide: true },
                    { kind: "switch", name: "isIllustrative", label: "This is an illustration, not a real screenshot", wide: true },
                  ]}
                />
              )}
            </TabsContent>
          </Tabs>

          {canEdit && ["general", "details", "technologies", "links", "publishing", "seo"].includes(tab) && (
            <div className="sticky bottom-3 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card/95 p-3 shadow-lg ring-1 ring-black/10 backdrop-blur">
              <p className="px-2 text-sm text-mute" aria-live="polite">
                {isDirty ? "You have unsaved edits." : isNew ? "Fill in the title and category to create the project." : "All changes saved."}
              </p>
              <div className="flex gap-2">
                {!isNew && isDirty && (
                  <Button variant="ghost" onClick={() => form.reset(toFormValues(data ?? null, allFields, DEFAULTS))}>
                    Reset
                  </Button>
                )}
                <Button loading={save.isPending} disabled={!isNew && !isDirty} onClick={form.handleSubmit((v) => save.mutate(v), () => toast.error("Please fix the highlighted fields"))}>
                  {isNew ? "Create project" : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </FormProvider>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this project?"
        description="The project, its features, technologies and image links are removed permanently. The image files stay in your media library."
        confirmLabel="Delete project"
        destructive
        loading={del.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => del.mutate()}
      />
    </>
  );
}

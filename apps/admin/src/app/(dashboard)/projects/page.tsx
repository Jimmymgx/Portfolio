"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { projectCategoryCreate, projectCategoryUpdate, projectCreate, projectUpdate, VISUAL_KINDS } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";
import { ErrorState, PageHeader, Skeleton, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { formatDate, titleCase } from "@/lib/utils";

function ProjectsInner() {
  const params = useSearchParams();
  const cats = useQuery({ queryKey: ["options", "projectCategories"], queryFn: async () => (await api.projectCategories.list({ pageSize: 100, sort: "sortOrder" })).items });
  const initialStatus = params.get("status") ?? "";

  return (
    <>
      <PageHeader title="Projects" description="Your portfolio work. Published projects appear in the expanding gallery in the order shown here." />
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {cats.isError ? (
            <div className="card">
              <ErrorState message={errorMessage(cats.error)} onRetry={() => cats.refetch()} />
            </div>
          ) : cats.isLoading || !cats.data ? (
            <Skeleton className="h-64" />
          ) : (
            <ResourcePage
              embedded
              title="Projects"
              resource="projects"
              singular="project"
              publishable
              reorderable
              createSchema={projectCreate}
              updateSchema={projectUpdate}
              rowTitle={(r) => r.title}
              newHref="/projects/new"
              editHref={(r) => `/projects/${r.id}`}
              initialStatus={initialStatus}
              emptyHint="Create a project, describe it, attach images and publish it. Nothing appears on the website until you publish."
              filters={[
                { name: "categoryId", label: "Category", options: cats.data.map((c) => ({ value: String(c.id), label: c.name })) },
                { name: "featured", label: "Featured", options: [{ value: "true", label: "Featured" }, { value: "false", label: "Not featured" }] },
              ]}
              extraActions={(row, { refresh }) => [
                {
                  label: "Duplicate",
                  onSelect: async () => {
                    try {
                      await api.projects.duplicate(row.id);
                      toast.success(`Created a draft copy of ${row.title}`);
                      refresh();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  },
                },
              ]}
              columns={[
                {
                  header: "Project",
                  cell: (r) => (
                    <span className="flex items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-soft text-mute" aria-hidden="true">
                        {r.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.coverUrl} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <ImageOff className="size-4" />
                        )}
                      </span>
                      <span>
                        <span className="block">{r.title}</span>
                        <span className="block text-xs font-normal text-mute">{cats.data.find((c) => c.id === r.categoryId)?.name ?? ""}</span>
                      </span>
                    </span>
                  ),
                },
                { header: "Featured", cell: (r) => (r.featured ? <Badge tone="dark">Featured</Badge> : "-"), hideOnMobile: true },
                { header: "Updated", cell: (r) => formatDate(r.updatedAt), hideOnMobile: true },
              ]}
              fields={[]}
            />
          )}
        </TabsContent>

        <TabsContent value="categories">
          <ResourcePage
            embedded
            title="Categories"
            description="The category decides which illustrative visual is shown when a project has no screenshot."
            resource="projectCategories"
            singular="category"
            reorderable
            searchable={false}
            createSchema={projectCategoryCreate}
            updateSchema={projectCategoryUpdate}
            rowTitle={(r) => r.name}
            defaults={{ visualKind: "WEBSITE" }}
            columns={[
              { header: "Category", cell: (r) => r.name },
              { header: "Visual", cell: (r) => titleCase(r.visualKind), hideOnMobile: true },
            ]}
            fields={[
              { kind: "text", name: "name", label: "Name", bilingual: true, required: true },
              { kind: "slug", name: "slug", label: "Slug", description: "Leave empty to generate it." },
              { kind: "select", name: "visualKind", label: "Illustrative visual", required: true, options: VISUAL_KINDS.map((k) => ({ value: k, label: titleCase(k) })) },
            ]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}

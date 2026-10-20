"use client";

import { useQuery } from "@tanstack/react-query";
import { skillCategoryCreate, skillCategoryUpdate, skillCreate, skillUpdate } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";
import { ErrorState, PageHeader, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";

export default function SkillsPage() {
  const cats = useQuery({ queryKey: ["options", "skillCategories"], queryFn: async () => (await api.skillCategories.list({ pageSize: 100, sort: "sortOrder" })).items });

  return (
    <>
      <PageHeader title="Skills" description="Each published skill becomes a tile in the periodic-table grid. Categories become the filter chips." />
      <Tabs defaultValue="skills">
        <TabsList>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          {cats.isError ? (
            <div className="card">
              <ErrorState message={errorMessage(cats.error)} onRetry={() => cats.refetch()} />
            </div>
          ) : cats.isLoading || !cats.data ? (
            <Skeleton className="h-64" />
          ) : (
            <ResourcePage
              embedded
              title="Skills"
              resource="skills"
              singular="skill"
              publishable
              reorderable
              dialogSize="lg"
              createSchema={skillCreate}
              updateSchema={skillUpdate}
              rowTitle={(r) => r.name}
              defaults={{ projectIds: [] }}
              emptyHint="Create a category first, then add the technologies you want to show. No skill levels are displayed."
              filters={[{ name: "categoryId", label: "Category", options: cats.data.map((c) => ({ value: String(c.id), label: c.name })) }]}
              columns={[
                {
                  header: "Skill",
                  cell: (r) => (
                    <span className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-lg bg-soft font-mono text-xs font-semibold" aria-hidden="true">
                        {r.symbol}
                      </span>
                      {r.name}
                    </span>
                  ),
                },
                { header: "Category", cell: (r) => cats.data.find((c) => c.id === r.categoryId)?.name ?? "-", hideOnMobile: true },
                { header: "Projects", cell: (r) => (r.projectIds?.length ? r.projectIds.length : "-"), hideOnMobile: true },
              ]}
              fields={[
                { kind: "text", name: "name", label: "Name", required: true, placeholder: "TypeScript" },
                { kind: "text", name: "symbol", label: "Symbol", required: true, max: 3, description: "One to three letters, shown big on the tile." },
                { kind: "select", name: "categoryId", label: "Category", required: true, numeric: true, options: cats.data.map((c) => ({ value: String(c.id), label: c.name })) },
                { kind: "slug", name: "slug", label: "Slug", description: "Leave empty to generate it from the name." },
                { kind: "media", name: "logoMediaId", label: "Logo", accept: "image", description: "Upload an official logo (SVG or PNG)." },
                { kind: "text", name: "externalLogoReference", label: "Bundled logo key", description: "Optional. Use a built-in logo such as react, nodejs or typescript instead of uploading." },
                { kind: "textarea", name: "description", label: "Description", bilingual: true, rows: 2 },
                {
                  kind: "multi",
                  name: "projectIds",
                  label: "Used in projects",
                  queryKey: "projects",
                  load: async () => (await api.projects.list({ pageSize: 100, sort: "title" })).items.map((p) => ({ value: p.id as number, label: p.title as string })),
                },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="categories">
          <ResourcePage
            embedded
            title="Categories"
            description="For example Languages, Frontend, Backend, Concepts."
            resource="skillCategories"
            singular="category"
            publishable
            reorderable
            createSchema={skillCategoryCreate}
            updateSchema={skillCategoryUpdate}
            rowTitle={(r) => r.name}
            columns={[
              { header: "Category", cell: (r) => r.name },
              { header: "Slug", cell: (r) => <code className="text-xs">{r.slug}</code>, hideOnMobile: true },
            ]}
            fields={[
              { kind: "text", name: "name", label: "Name", bilingual: true, required: true },
              { kind: "slug", name: "slug", label: "Slug", description: "Leave empty to generate it." },
              { kind: "textarea", name: "description", label: "Description", bilingual: true, rows: 2 },
            ]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

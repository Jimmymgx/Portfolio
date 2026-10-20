"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ZodType } from "zod";
import { FieldGrid, makeResolver, normalizeValues, toFormValues, type FieldDef } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeader, Pagination, RowActions, StatusBadge, TableSkeleton, type RowAction } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Resource } from "@portfolio/api-client";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type ResourceKey =
  | "skills"
  | "projects"
  | "projectFeatures"
  | "projectMedia"
  | "skillCategories"
  | "projectCategories"
  | "experience"
  | "education"
  | "certifications"
  | "achievements"
  | "socialLinks"
  | "aboutFacts"
  | "navigation";

export interface Column {
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export interface FilterDef {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

interface Props {
  title: string;
  description?: string;
  resource: ResourceKey;
  singular: string;
  columns: Column[];
  fields: FieldDef[];
  /** Fields shown when editing an existing record, if they differ from the create form. */
  editFields?: FieldDef[];
  createSchema: ZodType;
  updateSchema?: ZodType;
  defaults?: Record<string, unknown>;
  filters?: FilterDef[];
  publishable?: boolean;
  reorderable?: boolean;
  dialogSize?: "md" | "lg";
  rowTitle: (row: Row) => string;
  /** Extra values merged into the request body, for example a parent id. */
  extraBody?: () => Record<string, unknown>;
  /** Content shown above the table (for example a note). */
  intro?: ReactNode;
  headerActions?: ReactNode;
  /** Message when the list is empty. */
  emptyHint?: string;
  searchable?: boolean;
  pageSize?: number;
  /** Used inside tabs: shows a slim toolbar instead of a page header. */
  embedded?: boolean;
  /** Open a dedicated page instead of the dialog. */
  newHref?: string;
  editHref?: (row: Row) => string;
  /** Extra items in each row's menu. */
  extraActions?: (row: Row, tools: { refresh: () => void }) => RowAction[];
  initialStatus?: string;
  /** Always sent with list requests (for example { projectId }). */
  fixedParams?: Record<string, unknown>;
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function SortableRow({ id, label, disabled, children }: { id: number; label: string; disabled?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "relative z-10 bg-card shadow-lg" : "hover:bg-soft/50"}>
      <td className="w-10 py-3 pl-3">
        {!disabled && (
          <button type="button" className="cursor-grab touch-none rounded-md p-1 text-mute hover:bg-soft hover:text-ink active:cursor-grabbing" aria-label={`Reorder ${label}. Press space, then use the arrow keys`} {...attributes} {...listeners}>
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}
      </td>
      {children}
    </tr>
  );
}

export function ResourcePage(props: Props) {
  const { title, description, resource, singular, columns, fields, editFields, createSchema, updateSchema, defaults = {}, filters = [], publishable, reorderable, dialogSize = "md", rowTitle, extraBody, intro, headerActions, emptyHint, searchable = true, pageSize = 20, embedded, newHref, editHref, extraActions, initialStatus, fixedParams } = props;
  const router = useRouter();
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const res = api[resource] as unknown as Resource<Row>;

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initialStatus ?? "");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const dq = useDebounced(q);

  const params = { page, pageSize, q: dq || undefined, status: status || undefined, ...extra, ...(fixedParams ?? {}) } as Record<string, string | number | boolean | undefined>;
  const list = useQuery({ queryKey: ["list", resource, params], queryFn: () => res.list(params), placeholderData: keepPreviousData });
  const [items, setItems] = useState<Row[]>([]);
  useEffect(() => setItems(list.data?.items ?? []), [list.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["list", resource] });
    void qc.invalidateQueries({ queryKey: ["options"] }); // dropdowns elsewhere may list this resource
  };
  const openNew = () => (newHref ? router.push(newHref) : setEditing("new"));
  const openEdit = (row: Row) => (editHref ? router.push(editHref(row)) : setEditing(row));

  const statusMut = useMutation({
    mutationFn: ({ row, publish }: { row: Row; publish: boolean }) => (publish ? res.publish(row.id) : res.unpublish(row.id)),
    onSuccess: (_d, v) => {
      toast.success(v.publish ? `${rowTitle(v.row)} is now published` : `${rowTitle(v.row)} was unpublished`);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (row: Row) => res.remove(row.id),
    onSuccess: (_d, row) => {
      toast.success(`${rowTitle(row)} was deleted`);
      setDeleting(null);
      invalidate();
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      setDeleting(null);
    },
  });

  const reorderMut = useMutation({
    mutationFn: (ids: number[]) => res.reorder(ids),
    onSuccess: () => invalidate(),
    onError: (e) => {
      toast.error(errorMessage(e));
      invalidate();
    },
  });

  function move(row: Row, delta: number) {
    const from = items.findIndex((i) => i.id === row.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = arrayMove(items, from, to);
    setItems(next);
    reorderMut.mutate(next.map((i) => i.id));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    reorderMut.mutate(next.map((i) => i.id));
  }

  const canReorder = !!reorderable && canEdit;
  const anyFilter = !!dq || !!status || Object.values(extra).some(Boolean);
  const colSpan = columns.length + 2 + (canReorder ? 1 : 0);

  return (
    <>
      {embedded ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-sm text-mute">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {canEdit && (
              <Button onClick={openNew}>
                <Plus className="size-4" aria-hidden="true" />
                New {singular}
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
              {headerActions}
              {canEdit && (
                <Button onClick={openNew}>
                  <Plus className="size-4" aria-hidden="true" />
                  New {singular}
                </Button>
              )}
            </>
          }
        />
      )}
      {intro}

      <div className="card overflow-hidden">
        {(searchable || publishable || filters.length > 0) && (
          <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
            {searchable && (
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden="true" />
                <Input aria-label={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}`} className="pl-9" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
              </div>
            )}
            {filters.map((f) => (
              <Select key={f.name} aria-label={f.label} className="sm:w-48" value={extra[f.name] ?? ""} onChange={(e) => (setExtra((x) => ({ ...x, [f.name]: e.target.value })), setPage(1))}>
                <option value="">{f.label}: all</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ))}
            {publishable && (
              <Select aria-label="Status" className="sm:w-44" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
                <option value="">Status: all</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="UNPUBLISHED">Unpublished</option>
              </Select>
            )}
          </div>
        )}

        {list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.isLoading ? (
          <TableSkeleton cols={Math.min(columns.length, 4)} />
        ) : items.length === 0 ? (
          <EmptyState
            title={anyFilter ? "Nothing matches your filters" : `No ${title.toLowerCase()} yet`}
            description={anyFilter ? "Try clearing the search or filters." : (emptyHint ?? `Add your first ${singular} to get started.`)}
            action={canEdit && !anyFilter ? <Button onClick={openNew}>New {singular}</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-soft/50 text-xs uppercase tracking-wide text-mute">
                  <tr>
                    {canReorder && <th className="w-10" aria-label="Reorder" />}
                    {columns.map((c) => (
                      <th key={c.header} scope="col" className={`px-4 py-3 font-medium ${c.hideOnMobile ? "hidden md:table-cell" : ""} ${c.className ?? ""}`}>
                        {c.header}
                      </th>
                    ))}
                    {publishable && <th scope="col" className="px-4 py-3 font-medium">Status</th>}
                    <th scope="col" className="w-14 px-2 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy} disabled={!canReorder}>
                    {items.map((row, index) => {
                      const cells = (
                        <>
                          {columns.map((c, ci) => (
                            <td key={c.header} className={`px-4 py-3 align-middle ${c.hideOnMobile ? "hidden md:table-cell" : ""} ${c.className ?? ""}`}>
                              {ci === 0 && canEdit ? (
                                <button type="button" className="text-left font-medium underline-offset-4 hover:underline" onClick={() => openEdit(row)}>
                                  {c.cell(row)}
                                </button>
                              ) : (
                                c.cell(row)
                              )}
                            </td>
                          ))}
                          {publishable && (
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                          )}
                          <td className="px-2 py-3 text-right">
                            <RowActions
                              label={`Actions for ${rowTitle(row)}`}
                              actions={[
                                { label: canEdit ? "Edit" : "View", onSelect: () => openEdit(row) },
                                { label: "Publish", onSelect: () => statusMut.mutate({ row, publish: true }), hidden: !publishable || !canEdit || row.status === "PUBLISHED" },
                                { label: "Unpublish", onSelect: () => statusMut.mutate({ row, publish: false }), hidden: !publishable || !canEdit || row.status !== "PUBLISHED" },
                                { label: "Move up", onSelect: () => move(row, -1), hidden: !canReorder, disabled: index === 0 },
                                { label: "Move down", onSelect: () => move(row, 1), hidden: !canReorder, disabled: index === items.length - 1 },
                                ...(canEdit ? (extraActions?.(row, { refresh: invalidate }) ?? []) : []),
                                { label: "Delete", onSelect: () => setDeleting(row), destructive: true, hidden: !canEdit },
                              ]}
                            />
                          </td>
                        </>
                      );
                      return canReorder ? (
                        <SortableRow key={row.id} id={row.id} label={rowTitle(row)}>
                          {cells}
                        </SortableRow>
                      ) : (
                        <tr key={row.id} className="hover:bg-soft/50">
                          {cells}
                        </tr>
                      );
                    })}
                  </SortableContext>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={colSpan}>
                      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} total={list.data.meta.total} onPage={setPage} />}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </DndContext>
          </div>
        )}
      </div>

      {editing && (
        <ResourceForm
          key={editing === "new" ? "new" : editing.id}
          mode={editing === "new" ? "create" : "edit"}
          row={editing === "new" ? null : editing}
          singular={singular}
          fields={editing === "new" ? fields : (editFields ?? fields)}
          schema={editing === "new" ? createSchema : (updateSchema ?? createSchema)}
          defaults={defaults}
          size={dialogSize}
          readOnly={!canEdit}
          extraBody={extraBody}
          resource={res}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete this ${singular}?`}
        description={deleting ? `“${rowTitle(deleting)}” will be removed permanently. This cannot be undone.` : ""}
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting)}
      />
    </>
  );
}

function ResourceForm({ mode, row, singular, fields, schema, defaults, size, readOnly, extraBody, resource, onClose, onSaved }: { mode: "create" | "edit"; row: Row | null; singular: string; fields: FieldDef[]; schema: ZodType; defaults: Record<string, unknown>; size: "md" | "lg"; readOnly: boolean; extraBody?: () => Record<string, unknown>; resource: Resource<Row>; onClose: () => void; onSaved: () => void }) {
  const initial = useMemo(() => toFormValues(row, fields, defaults), [row, fields, defaults]);
  const form = useForm<Record<string, unknown>>({
    defaultValues: initial,
    resolver: makeResolver(schema, fields, extraBody),
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const body = { ...normalizeValues(values, fields), ...(extraBody?.() ?? {}) };
      return mode === "create" ? resource.create(body) : resource.update(row!.id, body);
    },
    onSuccess: () => {
      toast.success(mode === "create" ? `${singular} created` : `${singular} saved`);
      onSaved();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") {
        const fe = e.fieldErrors;
        Object.entries(fe).forEach(([path, message]) => form.setError(path as never, { message }));
        setFormError(Object.keys(fe).length ? "Please fix the highlighted fields." : e.message);
      } else setFormError(errorMessage(e));
    },
  });

  const requestClose = () => (form.formState.isDirty ? setConfirmClose(true) : onClose());

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && requestClose()}>
        <DialogContent title={readOnly ? `View ${singular}` : mode === "create" ? `New ${singular}` : `Edit ${singular}`} size={size === "lg" ? "lg" : "md"}>
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit((v) => {
                setFormError(null);
                save.mutate(v);
              })}
              noValidate
            >
              {formError && (
                <p role="alert" className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                  {formError}
                </p>
              )}
              <FieldGrid fields={fields} disabled={readOnly} idPrefix={`res-${mode}`} />
              <DialogFooter>
                <Button variant="outline" onClick={requestClose}>
                  {readOnly ? "Close" : "Cancel"}
                </Button>
                {!readOnly && (
                  <Button type="submit" loading={save.isPending}>
                    {mode === "create" ? "Create" : "Save changes"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirmClose} title="Discard your changes?" description="You have unsaved edits in this form." confirmLabel="Discard" cancelLabel="Keep editing" destructive onCancel={() => setConfirmClose(false)} onConfirm={onClose} />
    </>
  );
}

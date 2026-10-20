"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SectionSettingDto } from "@portfolio/types";
import { navigationItemCreate, navigationItemUpdate, SECTION_KEYS } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";
import { Button } from "@/components/ui/button";
import { Badge, ErrorState, PageHeader, Skeleton, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { titleCase } from "@/lib/utils";

function SectionRow({ s, index, last, canEdit, onToggle, onMove, onOption }: { s: SectionSettingDto; index: number; last: number; canEdit: boolean; onToggle: (v: boolean) => void; onMove: (d: number) => void; onOption: (v: boolean) => void }) {
  const locked = s.key === "HERO";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.key, disabled: !canEdit || locked });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-3 px-4 py-3 ${isDragging ? "relative z-10 rounded-xl bg-card shadow-lg" : ""}`}>
      <span className="w-6 text-center font-mono text-xs text-mute">{index + 1}</span>
      {canEdit && !locked ? (
        <button type="button" className="cursor-grab touch-none rounded-md p-1 text-mute hover:bg-soft active:cursor-grabbing" aria-label={`Reorder ${s.displayName}. Press space, then use the arrow keys`} {...attributes} {...listeners}>
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <span className="w-6" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{s.displayName}</p>
        <p className="text-xs text-mute">
          {titleCase(s.key)}
          {locked && " · always first"}
        </p>
      </div>
      {s.key === "EXPERIENCE" && (
        <label className="hidden items-center gap-2 text-xs text-mute md:flex">
          <Switch checked={!!s.configuration?.showNextCard} onCheckedChange={onOption} disabled={!canEdit} aria-label="Show the closing card Next, Your Team at the end of the timeline" />
          Closing card
        </label>
      )}
      {!s.isEnabled && <Badge>Hidden</Badge>}
      <div className="flex items-center gap-1">
        {canEdit && !locked && (
          <>
            <Button size="iconSm" variant="ghost" disabled={index <= 1} onClick={() => onMove(-1)} aria-label={`Move ${s.displayName} up`}>
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
            <Button size="iconSm" variant="ghost" disabled={index === last} onClick={() => onMove(1)} aria-label={`Move ${s.displayName} down`}>
              <ArrowDown className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}
        <Switch checked={s.isEnabled} onCheckedChange={onToggle} disabled={!canEdit} aria-label={`Show ${s.displayName} on the website`} />
      </div>
    </li>
  );
}

function Sections() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sections"], queryFn: () => api.sections.list() });
  const [items, setItems] = useState<SectionSettingDto[]>([]);
  useEffect(() => setItems(q.data ?? []), [q.data]);

  const reorder = useMutation({
    mutationFn: (keys: SectionSettingDto["key"][]) => api.sections.reorder(keys),
    onSuccess: (d) => (qc.setQueryData(["sections"], d), toast.success("Section order saved")),
    onError: (e) => (toast.error(errorMessage(e)), q.refetch()),
  });
  const toggle = useMutation({
    mutationFn: ({ key, isEnabled }: { key: SectionSettingDto["key"]; isEnabled: boolean }) => api.sections.update(key, { isEnabled }),
    onSuccess: (s) => {
      qc.setQueryData(["sections"], (old: SectionSettingDto[] | undefined) => old?.map((o) => (o.key === s.key ? s : o)));
      toast.success(`${s.displayName} is now ${s.isEnabled ? "visible" : "hidden"} on the website`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const option = useMutation({
    mutationFn: ({ key, showNextCard }: { key: SectionSettingDto["key"]; showNextCard: boolean }) => api.sections.update(key, { configuration: { showNextCard } }),
    onSuccess: (s) => {
      qc.setQueryData(["sections"], (old: SectionSettingDto[] | undefined) => old?.map((o) => (o.key === s.key ? s : o)));
      toast.success(`Closing card ${s.configuration?.showNextCard ? "shown" : "hidden"}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const commit = (next: SectionSettingDto[]) => {
    if (next[0]?.key !== "HERO") return toast.error("The hero always stays first");
    setItems(next);
    reorder.mutate(next.map((s) => s.key));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    commit(arrayMove(items, items.findIndex((i) => i.key === e.active.id), items.findIndex((i) => i.key === e.over!.id)));
  };

  if (q.isError)
    return (
      <div className="card">
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </div>
    );
  if (q.isLoading) return <Skeleton className="h-72" />;
  if (items.length === 0)
    return (
      <div className="card p-6 text-sm text-mute">
        No sections are configured yet. Run the content import (see the setup guide) to create the default sections: {SECTION_KEYS.map((k) => titleCase(k)).join(", ")}.
      </div>
    );

  return (
    <div className="card">
      <p className="border-b border-line px-5 py-3 text-sm text-mute">
        Turn sections on or off and set their order. Hidden sections keep all their content. Navigation links and section numbers update automatically.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-line">
            {items.map((s, i) => (
              <SectionRow
                key={s.key}
                s={s}
                index={i}
                last={items.length - 1}
                canEdit={canEdit}
                onToggle={(v) => toggle.mutate({ key: s.key, isEnabled: v })}
                onMove={(d) => commit(arrayMove(items, i, i + d))}
                onOption={(v) => option.mutate({ key: s.key, showNextCard: v })}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default function NavigationPage() {
  return (
    <>
      <PageHeader title="Sections & navigation" description="Control which sections appear on the website, in what order, and how they are labelled in the menu." />
      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="links">Menu labels</TabsTrigger>
        </TabsList>
        <TabsContent value="sections">
          <Sections />
        </TabsContent>
        <TabsContent value="links">
          <ResourcePage
            embedded
            title="Menu labels"
            description="The text of each navigation link. The link order follows the section order."
            resource="navigation"
            singular="menu item"
            reorderable
            searchable={false}
            createSchema={navigationItemCreate}
            updateSchema={navigationItemUpdate}
            rowTitle={(r) => r.label}
            defaults={{ isVisible: true }}
            columns={[
              { header: "Label", cell: (r) => r.label },
              { header: "Section", cell: (r) => (r.sectionKey ? titleCase(r.sectionKey) : "Custom link"), hideOnMobile: true },
              { header: "Shown", cell: (r) => (r.isVisible ? "Yes" : "No"), hideOnMobile: true },
            ]}
            fields={[
              { kind: "text", name: "label", label: "Label", bilingual: true, required: true },
              { kind: "select", name: "sectionKey", label: "Links to section", options: SECTION_KEYS.filter((k) => k !== "HERO").map((k) => ({ value: k, label: titleCase(k) })), description: "Leave empty for a custom link." },
              { kind: "text", name: "targetUrl", label: "Custom target", description: "Only for custom links: #anchor, /path or a full URL." },
              { kind: "switch", name: "isVisible", label: "Show in the menu", wide: true },
            ]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

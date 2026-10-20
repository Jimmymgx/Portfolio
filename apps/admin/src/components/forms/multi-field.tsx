"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api";

interface Props {
  name: string;
  label: string;
  description?: string;
  queryKey: string;
  load: () => Promise<{ value: number; label: string }[]>;
  disabled?: boolean;
}

/** Checklist for many-to-many relations (for example the technologies of a project). Value is an array of ids. */
export function MultiField({ name, label, description, queryKey, load, disabled }: Props) {
  const { control } = useFormContext();
  const [q, setQ] = useState("");
  const options = useQuery({ queryKey: ["options", queryKey], queryFn: load, staleTime: 60_000 });

  const filtered = useMemo(() => (options.data ?? []).filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options.data, q]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = new Set<number>((field.value as number[]) ?? []);
        const toggle = (id: number) => {
          const next = new Set(selected);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          field.onChange([...next]);
        };
        return (
          <fieldset className="space-y-2" disabled={disabled}>
            <legend className="text-sm font-medium">
              {label} <span className="font-normal text-mute">({selected.size} selected)</span>
            </legend>
            <Input aria-label={`Search ${label}`} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9" />
            <div className="max-h-52 overflow-y-auto rounded-xl bg-card p-1.5 shadow-[inset_0_0_0_1px_var(--line-2)]">
              {options.isLoading ? (
                <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div>
              ) : options.isError ? (
                <p role="alert" className="p-3 text-sm text-danger">{errorMessage(options.error)}</p>
              ) : filtered.length === 0 ? (
                <p className="p-3 text-sm text-mute">Nothing to choose from yet.</p>
              ) : (
                filtered.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-soft">
                    <input type="checkbox" className="size-4 accent-black" checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
                    {o.label}
                  </label>
                ))
              )}
            </div>
            {description && <p className="text-xs text-mute">{description}</p>}
          </fieldset>
        );
      }}
    />
  );
}

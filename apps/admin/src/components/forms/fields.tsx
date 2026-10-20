"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFormContext, type FieldValues, type Resolver } from "react-hook-form";
import type { ZodType } from "zod";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, Switch } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { MediaField } from "./media-field";
import { MultiField } from "./multi-field";

type Base = {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  /** Spans both columns of the form grid. */
  wide?: boolean;
};

export type FieldDef =
  | (Base & { kind: "text" | "url" | "email" | "date" | "slug" | "number"; bilingual?: boolean; placeholder?: string; max?: number })
  | (Base & { kind: "textarea"; bilingual?: boolean; rows?: number; placeholder?: string; max?: number })
  | (Base & { kind: "select"; options: { value: string; label: string }[]; allowEmpty?: boolean; numeric?: boolean })
  | (Base & { kind: "multi"; queryKey: string; load: () => Promise<{ value: number; label: string }[]> })
  | (Base & { kind: "switch" })
  | (Base & { kind: "media"; accept: "image" | "video" | "document" | "any" });

type Errors = Record<string, { message?: string } | undefined>;

function inputFor(def: Extract<FieldDef, { kind: "text" | "url" | "email" | "date" | "slug" | "number" }>, id: string, props: { error?: string; dir?: "rtl"; disabled?: boolean }, register: ReturnType<typeof useFormContext>["register"], name: string) {
  const type = def.kind === "date" ? "date" : def.kind === "email" ? "email" : def.kind === "url" ? "url" : def.kind === "number" ? "number" : "text";
  return (
    <Input
      id={id}
      type={type}
      dir={props.dir}
      lang={props.dir === "rtl" ? "ar" : undefined}
      placeholder={def.placeholder ?? (def.kind === "url" ? "https://" : undefined)}
      maxLength={def.max}
      disabled={props.disabled}
      inputMode={def.kind === "number" ? "numeric" : undefined}
      aria-invalid={!!props.error}
      aria-describedby={props.error ? `${id}-err` : def.description ? `${id}-desc` : undefined}
      {...register(name)}
    />
  );
}

/** Renders one definition. Bilingual text fields render English and Arabic side by side. */
export function FieldRenderer({ def, disabled, idPrefix = "f" }: { def: FieldDef; disabled?: boolean; idPrefix?: string }) {
  const { register, control, formState } = useFormContext<FieldValues>();
  const errors = formState.errors as Errors;
  const id = `${idPrefix}-${def.name}`;

  if (def.kind === "switch") {
    return (
      <Controller
        control={control}
        name={def.name}
        render={({ field }) => (
          <div className={cn("flex items-start justify-between gap-4 rounded-xl bg-soft/60 px-4 py-3", def.wide && "sm:col-span-2")}>
            <div>
              <label htmlFor={id} className="text-sm font-medium">
                {def.label}
              </label>
              {def.description && (
                <p id={`${id}-desc`} className="text-xs text-mute">
                  {def.description}
                </p>
              )}
            </div>
            <Switch id={id} checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} aria-describedby={def.description ? `${id}-desc` : undefined} />
          </div>
        )}
      />
    );
  }

  if (def.kind === "select") {
    const err = errors[def.name]?.message;
    return (
      <Field label={def.label} htmlFor={id} description={def.description} error={err} required={def.required} className={def.wide ? "sm:col-span-2" : undefined}>
        <Select id={id} disabled={disabled} aria-invalid={!!err} aria-describedby={err ? `${id}-err` : def.description ? `${id}-desc` : undefined} {...register(def.name)}>
          {(def.allowEmpty ?? !def.required) && <option value="">Not set</option>}
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (def.kind === "multi") {
    return (
      <div className="sm:col-span-2">
        <MultiField name={def.name} label={def.label} description={def.description} queryKey={def.queryKey} load={def.load} disabled={disabled} />
      </div>
    );
  }

  if (def.kind === "media") {
    return (
      <div className={def.wide ? "sm:col-span-2" : undefined}>
        <MediaField name={def.name} label={def.label} accept={def.accept} description={def.description} disabled={disabled} />
      </div>
    );
  }

  const bilingual = "bilingual" in def && def.bilingual;
  const single = (name: string, label: string, dir?: "rtl") => {
    const err = errors[name]?.message;
    const fid = `${idPrefix}-${name}`;
    return (
      <Field key={name} label={label} htmlFor={fid} description={dir ? undefined : def.description} error={err} required={!dir && def.required}>
        {def.kind === "textarea" ? (
          <Textarea id={fid} rows={def.rows} dir={dir} lang={dir ? "ar" : undefined} placeholder={def.placeholder} maxLength={def.max} disabled={disabled} aria-invalid={!!err} aria-describedby={err ? `${fid}-err` : undefined} {...register(name)} />
        ) : (
          inputFor(def, fid, { error: err, dir, disabled }, register, name)
        )}
      </Field>
    );
  };

  if (bilingual) {
    return (
      <div className={cn("grid gap-4 sm:col-span-2 sm:grid-cols-2")}>
        {single(def.name, `${def.label} (English)`)}
        {single(`${def.name}Ar`, `${def.label} (العربية)`, "rtl")}
      </div>
    );
  }
  return <div className={def.wide ? "sm:col-span-2" : undefined}>{single(def.name, def.label)}</div>;
}

export function FieldGrid({ fields, disabled, idPrefix }: { fields: FieldDef[]; disabled?: boolean; idPrefix?: string }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
      {fields.map((f) => (
        <FieldRenderer key={f.name} def={f} disabled={disabled} idPrefix={idPrefix} />
      ))}
    </div>
  );
}

/** Turns raw form values into what the API schemas expect: empty strings become undefined, numbers become numbers. */
export function normalizeValues(values: Record<string, unknown>, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const f of fields) {
    if (f.kind === "number") {
      const v = out[f.name];
      out[f.name] = v === "" || v === null || v === undefined ? null : Number(v);
    }
    if (f.kind === "slug" && (out[f.name] === "" || out[f.name] === null)) delete out[f.name];
    if (f.kind === "select" && !f.numeric && out[f.name] === "" && !f.required) out[f.name] = null;
    if (f.kind === "select" && f.numeric) {
      const v = out[f.name];
      out[f.name] = v === "" || v === null || v === undefined ? undefined : Number(v);
    }
    if (f.kind === "media") {
      const v = out[f.name];
      out[f.name] = v === "" || v === undefined ? null : v;
    }
  }
  return out;
}

/** Initial form values from a stored record: nulls become empty strings so inputs stay controlled. */
export function toFormValues(record: Record<string, unknown> | null | undefined, fields: FieldDef[], defaults: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = { ...defaults };
  const names = fields.flatMap((f) => {
    const list = [f.name];
    if ("bilingual" in f && f.bilingual) list.push(`${f.name}Ar`);
    return list;
  });
  for (const n of names) {
    const v = record?.[n];
    const def = fields.find((f) => f.name === n || `${f.name}Ar` === n);
    if (def?.kind === "switch") out[n] = v ?? defaults[n] ?? false;
    else if (def?.kind === "media") out[n] = v ?? null;
    else if (def?.kind === "multi") out[n] = v ?? [];
    else if (def?.kind === "select" && def.numeric) out[n] = v === undefined || v === null ? "" : String(v);
    else out[n] = v ?? defaults[n] ?? "";
  }
  return out;
}

/** Zod resolver that first normalizes raw form values (empty strings, numbers) the same way submit does. */
export function makeResolver(schema: ZodType, fields: FieldDef[], extra?: () => Record<string, unknown>): Resolver<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (async (values: Record<string, unknown>, ctx: unknown, opts: never) =>
    zodResolver(schema as never)({ ...normalizeValues(values, fields), ...(extra?.() ?? {}) } as never, ctx as never, opts)) as unknown as Resolver<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

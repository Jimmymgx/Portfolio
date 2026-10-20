"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { cn, titleCase } from "@/lib/utils";
import { Button } from "./button";

/* ───────── badge & status ───────── */

const tones = {
  neutral: "bg-soft text-ink-2",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  dark: "bg-accent text-on-accent",
} as const;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}

const STATUS_TONE: Record<string, keyof typeof tones> = {
  PUBLISHED: "ok",
  DRAFT: "warn",
  UNPUBLISHED: "neutral",
  NEW: "dark",
  READ: "neutral",
  ARCHIVED: "neutral",
  ACTIVE: "ok",
  DISABLED: "danger",
  SUPER_ADMIN: "dark",
  EDITOR: "neutral",
  VIEWER: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{titleCase(status)}</Badge>;
}

/* ───────── page structure ───────── */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-soft text-mute" aria-hidden="true">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <AlertCircle className="size-6 text-danger" aria-hidden="true" />
      <p className="max-w-md text-sm text-ink-2">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-5", c === 0 ? "w-1/3" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return <p className="px-4 py-3 text-xs text-mute">{total} {total === 1 ? "item" : "items"}</p>;
  return (
    <nav className="flex items-center justify-between gap-3 px-4 py-3" aria-label="Pagination">
      <p className="text-xs text-mute">
        Page {page} of {totalPages} · {total} items
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="iconSm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="outline" size="iconSm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/* ───────── form pieces ───────── */

export function Field({ label, htmlFor, description, error, required, children, className }: { label: string; htmlFor: string; description?: string; error?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {description && !error && (
        <p id={`${htmlFor}-desc`} className="text-xs text-mute">
          {description}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-err`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root ref={ref} className={cn("peer inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-switch-off transition-colors data-[state=checked]:bg-accent disabled:opacity-50", className)} {...props}>
    <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

/* ───────── tabs ───────── */

export const Tabs = TabsPrimitive.Root;
export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-soft p-1", className)} {...props} />
));
TabsList.displayName = "TabsList";
export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn("whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium text-mute transition-colors hover:text-ink data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-sm", className)} {...props} />
));
TabsTrigger.displayName = "TabsTrigger";
export const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-5 focus-visible:outline-offset-4", className)} {...props} />
));
TabsContent.displayName = "TabsContent";

/* ───────── row actions menu ───────── */

export interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

export function RowActions({ actions, label = "Row actions" }: { actions: RowAction[]; label?: string }) {
  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>
        <Button variant="ghost" size="iconSm" aria-label={label}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align="end" sideOffset={6} className="z-50 min-w-44 rounded-xl bg-card p-1.5 shadow-xl ring-1 ring-black/10">
          {visible.map((a) => (
            <DropdownPrimitive.Item
              key={a.label}
              disabled={a.disabled}
              onSelect={a.onSelect}
              className={cn("flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-soft", a.destructive && "text-danger")}
            >
              {a.label}
            </DropdownPrimitive.Item>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

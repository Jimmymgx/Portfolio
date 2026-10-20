"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Award, Check, ExternalLink, Eye, FolderKanban, Image as ImageIcon, Inbox, Plus, Rocket, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Badge, EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { OwnerAvatar } from "@/components/owner-avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useOwner } from "@/lib/owner";
import { formatDate, titleCase } from "@/lib/utils";
import { toast } from "sonner";
import type { AreaStatus, SetupItem } from "@portfolio/types";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

function SetupCard({ items }: { items: SetupItem[] }) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const todo = items.filter((i) => !i.done);
  return (
    <section className="card p-6 lg:col-span-2" aria-labelledby="setup-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="setup-title" className="text-[17px] font-semibold tracking-tight">
            {todo.length ? "Finish setting up your site" : "Your site is fully set up"}
          </h2>
          <p className="mt-0.5 text-sm text-mute">{todo.length ? `${done} of ${items.length} done. These are the things only you can approve or write.` : "Everything on the checklist is done."}</p>
        </div>
        <div className="flex items-center gap-3" role="img" aria-label={`${pct} percent complete`}>
          <div className="h-2 w-36 overflow-hidden rounded-full bg-soft">
            <div className="h-full rounded-full bg-[image:var(--brand-grad)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-sm font-medium">{pct}%</span>
        </div>
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={i.href} className="flex items-start gap-3 rounded-2xl p-3 transition-colors hover:bg-soft">
              <span aria-hidden="true" className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${i.done ? "bg-ok-bg text-ok" : "bg-soft text-mute shadow-[inset_0_0_0_1.5px_var(--line-2)]"}`}>
                {i.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 leading-snug">
                <span className={`block text-sm font-semibold ${i.done ? "text-mute line-through decoration-1" : ""}`}>{i.title}</span>
                <span className="block text-xs text-mute">{i.done ? "Done" : i.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const AREA_TONE = { LIVE: "ok", DRAFT: "warn", EMPTY: "neutral" } as const;
const AREA_LABEL = { LIVE: "Live", DRAFT: "Draft only", EMPTY: "Not started" } as const;

function GlanceCard({ areas, lastPublishedAt, canEdit }: { areas: AreaStatus[]; lastPublishedAt: string | null; canEdit: boolean }) {
  async function preview() {
    try {
      const { url } = await api.previewLink("en", "/");
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <section className="card p-6 lg:col-span-1" aria-labelledby="glance-title">
      <h2 id="glance-title" className="text-[17px] font-semibold tracking-tight">
        Your site at a glance
      </h2>
      <p className="mt-0.5 text-sm text-mute">{lastPublishedAt ? `Last published ${formatDate(lastPublishedAt, true)}` : "Nothing published from the dashboard yet."}</p>
      <ul className="mt-4 divide-y divide-line">
        {areas.map((a) => (
          <li key={a.key}>
            <Link href={a.href} className="flex items-center justify-between gap-3 py-2.5 text-sm font-medium hover:text-accent">
              {a.label}
              <Badge tone={AREA_TONE[a.status]}>{AREA_LABEL[a.status]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <a href={WEB_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Open my site
          </a>
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={preview}>
            <Eye className="size-3.5" aria-hidden="true" />
            See drafts
          </Button>
        )}
      </div>
    </section>
  );
}

const TONES = ["bg-accent-soft text-accent", "bg-danger-bg text-danger", "bg-ok-bg text-ok", "bg-warn-bg text-warn"] as const;

function Stat({ label, value, hint, icon, href, tone }: { label: string; value: number | string; hint?: string; icon: ReactNode; href: string; tone: number }) {
  return (
    <Link href={href} className="card group flex flex-col gap-4 p-4 transition-transform sm:gap-5 sm:p-5 hover:-translate-y-0.5">
      <span className="flex items-center justify-between">
        <span className={`grid size-11 place-items-center rounded-[14px] ${TONES[tone % TONES.length]}`} aria-hidden="true">
          {icon}
        </span>
        <ArrowUpRight className="size-4 text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-[2rem] font-semibold sm:text-[2.5rem] leading-none tracking-[-0.04em]">{value}</span>
        <span className="mt-1.5 block text-sm font-medium">{label}</span>
        <span className="block min-h-4 text-xs text-mute">{hint}</span>
      </span>
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user, canEdit } = useAuth();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard(), refetchOnMount: "always" });
  const [hello, setHello] = useState("Welcome");
  useEffect(() => setHello(greeting()), []);
  const owner = useOwner();
  const first = owner?.firstName ?? (user ? user.name.split(" ")[0] : "");

  return (
    <>
      <section aria-label="Welcome" className="relative mb-7 flex flex-wrap items-end justify-between gap-7 overflow-hidden rounded-[28px] bg-[image:var(--hero)] p-8 sm:p-10">
        <div aria-hidden="true" className="absolute -right-20 -top-36 size-[380px] rounded-full bg-[var(--orb-1)] opacity-80 blur-[60px]" />
        <div aria-hidden="true" className="absolute -bottom-44 left-[30%] size-[300px] rounded-full bg-[var(--orb-2)] opacity-70 blur-[70px]" />
        <div className="relative flex max-w-2xl items-center gap-6 text-[var(--hero-ink)]">
          <OwnerAvatar owner={owner} className="hidden size-28 ring-4 ring-[var(--glass-line)] sm:block sm:size-28" textClassName="text-3xl" />
          <div className="space-y-3.5">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--hero-ink-2)]">{hello}</p>
          <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-none tracking-[-0.035em]">
            Welcome{first && ","} {first && <span className="display-serif font-normal">{first}</span>}
          </h1>
          {owner?.firstNameAr && (
            <p lang="ar" dir="rtl" className="w-fit text-xl font-semibold text-[var(--hero-ink)]">
              أهلاً بك يا {owner.firstNameAr}
            </p>
          )}
          <p className="text-base text-[var(--hero-ink-2)]">A live view of your content. Every number comes from the database.</p>
          </div>
        </div>
        {canEdit && (
          <div className="relative flex flex-wrap gap-2.5">
            <Link href="/projects/new" className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--hero-ink)] px-6 text-[15px] font-semibold text-[var(--hero-bg)] transition-opacity hover:opacity-90">
              <Plus className="size-[18px]" aria-hidden="true" />
              New project
            </Link>
            {[
              { href: "/media", label: "Upload media" },
              { href: "/profile", label: "Edit profile" },
              { href: "/navigation", label: "Sections & navigation" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex h-12 items-center rounded-full border border-[var(--glass-line)] bg-[var(--glass)] px-5 text-[15px] font-medium text-[var(--hero-ink)] backdrop-blur-xl transition-colors hover:bg-[var(--glass-line)]">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      {q.isError ? (
        <div className="card">
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        </div>
      ) : (
        <>
          <section aria-label="Content overview" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {q.isLoading || !q.data ? (
              Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[88px]" />)
            ) : (
              <>
                <Stat label="Projects" value={q.data.stats.projects.total} hint={`${q.data.stats.projects.published} published · ${q.data.stats.projects.draft} draft`} tone={0} icon={<Rocket className="size-5" />} href="/projects" />
                <Stat label="Skills" value={q.data.stats.skills} tone={1} icon={<Zap className="size-5" />} href="/skills" />
                <Stat label="Certifications" value={q.data.stats.certifications} tone={2} icon={<Award className="size-5" />} href="/certifications" />
                <Stat label="Achievements" value={q.data.stats.achievements} tone={3} icon={<Trophy className="size-5" />} href="/achievements" />
                <Stat label="Media files" value={q.data.stats.media} tone={1} icon={<ImageIcon className="size-5" />} href="/media" />
                <Stat label="New messages" value={q.data.stats.newMessages} tone={0} icon={<Inbox className="size-5" />} href="/messages" />
                <Stat label="Published projects" value={q.data.stats.projects.published} tone={2} icon={<FolderKanban className="size-5" />} href="/projects?status=PUBLISHED" />
                <Stat label="Draft projects" value={q.data.stats.projects.draft} tone={3} icon={<FolderKanban className="size-5" />} href="/projects?status=DRAFT" />
              </>
            )}
          </section>

          {q.data && (
            <div className="mt-7 grid items-start gap-5 lg:grid-cols-3">
              <SetupCard items={q.data.setup} />
              <GlanceCard areas={q.data.areas} lastPublishedAt={q.data.lastPublishedAt} canEdit={canEdit} />
            </div>
          )}

          <div className="mt-7 grid items-start gap-5 lg:grid-cols-3">
            <section className="card overflow-hidden lg:col-span-1" aria-labelledby="recent-projects">
              <h2 id="recent-projects" className="px-6 pb-3 pt-5 text-[17px] font-semibold tracking-tight">
                Recently edited projects
              </h2>
              {q.isLoading ? (
                <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div>
              ) : q.data && q.data.recentProjects.length > 0 ? (
                <ul className="pb-3">
                  {q.data.recentProjects.map((p) => (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="mx-2 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-soft">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.title}</span>
                          <span className="block text-xs text-mute">{formatDate(p.updatedAt, true)}</span>
                        </span>
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No projects yet" description="Add your first project to see it here." />
              )}
            </section>

            <section className="card overflow-hidden lg:col-span-1" aria-labelledby="recent-messages">
              <h2 id="recent-messages" className="px-6 pb-3 pt-5 text-[17px] font-semibold tracking-tight">
                Recent messages
              </h2>
              {q.isLoading ? (
                <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5" />)}</div>
              ) : q.data && q.data.recentMessages.length > 0 ? (
                <ul className="pb-3">
                  {q.data.recentMessages.map((m) => (
                    <li key={m.id}>
                      <Link href="/messages" className="mx-2 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-soft">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{m.name}</span>
                          <span className="block truncate text-xs text-mute">{m.subject || "No subject"} · {formatDate(m.createdAt)}</span>
                        </span>
                        <StatusBadge status={m.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No messages" description="Messages from your contact form appear here." />
              )}
            </section>

            <section className="card overflow-hidden lg:col-span-1" aria-labelledby="recent-activity">
              <h2 id="recent-activity" className="px-6 pb-3 pt-5 text-[17px] font-semibold tracking-tight">
                Recent activity
              </h2>
              {q.isLoading ? (
                <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5" />)}</div>
              ) : q.data && q.data.recentActivity.length > 0 ? (
                <ol className="px-6 pb-5 pt-1">
                  {q.data.recentActivity.map((a) => (
                    <li key={a.id} className="flex gap-3.5 pb-4 last:pb-0">
                      <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />
                      <span className="leading-snug">
                        <span className="block text-sm font-semibold">{titleCase(String(a.action).replace(".", " "))}</span>
                        <span className="block text-xs text-mute">
                          {a.actorEmail ?? "System"} · {formatDate(a.createdAt, true)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="Nothing yet" description="Changes you make will be listed here." />
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

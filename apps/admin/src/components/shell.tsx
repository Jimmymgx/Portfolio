"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BriefcaseBusiness,
  ExternalLink,
  FileClock,
  GraduationCap,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Mail,
  Menu,
  Rocket,
  Search,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  User,
  UserCog,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useOwner } from "@/lib/owner";
import { useUnsaved } from "@/lib/unsaved";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { OwnerAvatar } from "./owner-avatar";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "./ui/primitives";

interface Item {
  href: string;
  label: string;
  icon: ReactNode;
  superOnly?: boolean;
}

const ic = "size-[18px]";

const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className={ic} /> }] },
  {
    title: "Content",
    items: [
      { href: "/profile", label: "Profile", icon: <User className={ic} /> },
      { href: "/hero", label: "Hero", icon: <Video className={ic} /> },
      { href: "/about", label: "About", icon: <Sparkles className={ic} /> },
      { href: "/skills", label: "Skills", icon: <Zap className={ic} /> },
      { href: "/projects", label: "Projects", icon: <Rocket className={ic} /> },
      { href: "/experience", label: "Experience", icon: <BriefcaseBusiness className={ic} /> },
      { href: "/education", label: "Education", icon: <GraduationCap className={ic} /> },
      { href: "/certifications", label: "Certifications", icon: <Award className={ic} /> },
      { href: "/achievements", label: "Achievements", icon: <Trophy className={ic} /> },
      { href: "/contact", label: "Contact", icon: <Mail className={ic} /> },
      { href: "/social-links", label: "Social links", icon: <Share2 className={ic} /> },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/media", label: "Media library", icon: <ImageIcon className={ic} /> },
      { href: "/navigation", label: "Sections & navigation", icon: <LayoutList className={ic} /> },
      { href: "/seo", label: "SEO", icon: <Search className={ic} /> },
      { href: "/messages", label: "Messages", icon: <Inbox className={ic} /> },
      { href: "/settings", label: "Settings", icon: <Settings className={ic} /> },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/users", label: "Users", icon: <Users className={ic} />, superOnly: true },
      { href: "/audit-logs", label: "Audit log", icon: <FileClock className={ic} />, superOnly: true },
    ],
  },
];

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

function NavLink({ item, onNavigate, badge }: { item: Item; onNavigate?: () => void; badge?: number }) {
  const pathname = usePathname();
  const { navigate, hasUnsaved } = useUnsaved();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        onNavigate?.();
        if (hasUnsaved() && !active) {
          e.preventDefault();
          navigate(item.href);
        }
      }}
      className={cn("flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors", active ? "bg-accent font-semibold text-on-accent shadow-[0_8px_20px_-12px_var(--accent)]" : "text-mute hover:bg-soft hover:text-ink")}
    >
      <span aria-hidden="true">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {badge ? <Badge tone={active ? "neutral" : "dark"} className="min-w-[22px] justify-center">{badge}</Badge> : null}
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isSuperAdmin } = useAuth();
  const owner = useOwner();
  const unread = useQuery({
    queryKey: ["messages", "unread"],
    queryFn: async () => (await api.messages.list({ status: "NEW", pageSize: 1 })).meta.total,
    refetchInterval: 60_000,
  });
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="flex items-center gap-3 px-2">
        <OwnerAvatar owner={owner} className="size-11 ring-2 ring-accent-soft" textClassName="font-mono text-xs" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-bold tracking-tight">{owner?.fullName ?? "Portfolio Studio"}</p>
          <p className="text-xs text-mute">Your content studio</p>
        </div>
      </div>
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.superOnly || isSuperAdmin);
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-mute">{g.title}</p>
            <ul className="space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <NavLink item={i} onNavigate={onNavigate} badge={i.href === "/messages" ? unread.data : undefined} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Crumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  return (
    <ol className="flex items-center gap-1.5 text-sm text-mute" aria-label="Breadcrumb">
      <li>CMS</li>
      {parts.map((p, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span aria-hidden="true">/</span>
          <span className={cn(i === parts.length - 1 && "font-medium text-ink")} aria-current={i === parts.length - 1 ? "page" : undefined}>
            {/^\d+$/.test(p) ? `#${p}` : p.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, signOut, canEdit } = useAuth();
  const [open, setOpen] = useState(false);

  async function preview() {
    try {
      const { url } = await api.previewLink("en", "/");
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-panel lg:block">
        <Sidebar />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-line bg-[var(--bar)] px-4 backdrop-blur-md lg:px-8">
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
              <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-panel shadow-2xl">
                <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Pages of the content management system</DialogPrimitive.Description>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="iconSm" className="absolute right-3 top-3" aria-label="Close navigation">
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </DialogPrimitive.Close>
                <Sidebar onNavigate={() => setOpen(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <div className="hidden min-w-0 flex-1 sm:block">
            <Crumbs />
          </div>
          <div className="flex-1 sm:hidden" />

          <Button variant="outline" size="default" className="rounded-full" asChild>
            <a href={WEB_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">View site</span>
              <span className="sr-only sm:hidden">View site</span>
            </a>
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={preview} className="hidden rounded-full sm:inline-flex">
              Preview drafts
            </Button>
          )}
          <ThemeToggle />
          <div className="flex items-center gap-2.5 rounded-full bg-card p-1 pr-1.5 shadow-[inset_0_0_0_1px_var(--line)] md:pr-3">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-[image:var(--brand-grad)] text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="hidden text-left leading-tight md:block">
              <p className="text-[13px] font-semibold">{user?.name}</p>
              <p className="text-[11px] capitalize text-mute">{user?.role.replace("_", " ").toLowerCase()}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="rounded-full">
            <LogOut className="size-[18px]" aria-hidden="true" />
          </Button>
        </header>

        <main id="content" className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("pf-theme", t);
  } catch {
    /* storage can be blocked; the choice then only lasts for this visit */
  }
}

export function ThemeToggle({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"), []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        apply(next);
        setTheme(next);
      }}
      aria-label={`Switch to ${next} mode`}
      className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-full bg-card text-sm font-medium text-ink shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-soft", showLabel ? "px-4" : "w-11", className)}
    >
      {theme === "dark" ? <Sun className="size-[18px]" aria-hidden="true" /> : <Moon className="size-[18px]" aria-hidden="true" />}
      {showLabel && <span>{next === "dark" ? "Dark" : "Light"}</span>}
    </button>
  );
}

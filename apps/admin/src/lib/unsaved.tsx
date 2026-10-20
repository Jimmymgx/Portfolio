"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface UnsavedValue {
  /** Forms report whether they hold unsaved edits. */
  setDirty: (key: string, dirty: boolean) => void;
  /** Navigates, asking first if any form has unsaved edits. */
  navigate: (href: string) => void;
  hasUnsaved: () => boolean;
}

const Ctx = createContext<UnsavedValue | null>(null);

export function useUnsaved() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUnsaved must be used inside UnsavedProvider");
  return v;
}

/** Marks a form dirty for as long as it has unsaved edits. Also warns on tab close or reload. */
export function useUnsavedChanges(key: string, dirty: boolean) {
  const { setDirty } = useUnsaved();
  useEffect(() => {
    setDirty(key, dirty);
    return () => setDirty(key, false);
  }, [key, dirty, setDirty]);
}

export function UnsavedProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dirty = useRef(new Set<string>());
  const [pending, setPending] = useState<string | null>(null);

  const setDirty = useCallback((key: string, isDirty: boolean) => {
    if (isDirty) dirty.current.add(key);
    else dirty.current.delete(key);
  }, []);

  const hasUnsaved = useCallback(() => dirty.current.size > 0, []);

  const navigate = useCallback(
    (href: string) => {
      if (dirty.current.size > 0) setPending(href);
      else router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const value = useMemo(() => ({ setDirty, navigate, hasUnsaved }), [setDirty, navigate, hasUnsaved]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title="Leave without saving?"
        description="You have changes that have not been saved. If you leave now they will be lost."
        confirmLabel="Leave page"
        cancelLabel="Stay and keep editing"
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => {
          dirty.current.clear();
          const href = pending!;
          setPending(null);
          router.push(href);
        }}
      />
    </Ctx.Provider>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { AdminUserDto } from "@portfolio/types";
import { api, ApiError } from "./api";
import { atLeast } from "./roles";

interface AuthValue {
  user: AdminUserDto | null;
  loading: boolean;
  canEdit: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return (await api.auth.me()).user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const goToLogin = useCallback(() => {
    qc.setQueryData(["me"], null);
    if (pathname !== "/login") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, qc, router]);

  // Any 401 from the API (expired or revoked session) sends the user back to sign in.
  useEffect(() => {
    window.addEventListener("cms:unauthorized", goToLogin);
    return () => window.removeEventListener("cms:unauthorized", goToLogin);
  }, [goToLogin]);

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      qc.clear();
      router.replace("/login");
    }
  }, [qc, router]);

  const user = me.data ?? null;
  const value = useMemo<AuthValue>(
    () => ({ user, loading: me.isLoading, canEdit: atLeast(user?.role, "EDITOR"), isSuperAdmin: atLeast(user?.role, "SUPER_ADMIN"), signOut }),
    [user, me.isLoading, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

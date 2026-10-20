"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";

/** Everything under (dashboard) needs a signed-in user. The API enforces this too; this only avoids showing an empty shell. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10" role="status" aria-label="Loading">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}

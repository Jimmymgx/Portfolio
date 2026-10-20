import { useQuery } from "@tanstack/react-query";
import { API_URL, api } from "@/lib/api";

export interface OwnerView {
  fullName: string | null;
  firstName: string | null;
  firstNameAr: string | null;
  initials: string;
  avatarUrl: string | null;
  avatarAlt: string;
}

const initialsOf = (name: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** The site owner as set in the CMS profile. Signed-in screens only. */
export function useOwner(): OwnerView | null {
  const q = useQuery({ queryKey: ["owner"], queryFn: () => api.owner(), staleTime: 5 * 60 * 1000, retry: false });
  const o = q.data;
  if (!o) return null;
  return { fullName: o.fullName, firstName: o.firstName, firstNameAr: o.firstNameAr, initials: initialsOf(o.fullName), avatarUrl: o.avatarUrl, avatarAlt: o.avatarAlt ?? `Illustrated avatar of ${o.fullName ?? "the site owner"}` };
}

/** For the sign-in screen, where nobody is signed in yet: reads the public profile that the website already shows. */
export function usePublicOwner(): OwnerView | null {
  const q = useQuery({
    queryKey: ["owner", "public"],
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/public/portfolio?lang=en`);
      if (!res.ok) throw new Error("unavailable");
      const body = (await res.json()) as { data?: { profile?: { fullName?: string; firstName?: string; initials?: string; avatarUrl?: string | null } } };
      return body.data?.profile ?? null;
    },
  });
  const p = q.data;
  if (!p?.fullName) return null;
  return { fullName: p.fullName, firstName: p.firstName ?? null, firstNameAr: null, initials: p.initials ?? initialsOf(p.fullName), avatarUrl: p.avatarUrl ?? null, avatarAlt: `Illustrated avatar of ${p.fullName}` };
}

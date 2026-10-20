import { cn } from "@/lib/utils";
import type { OwnerView } from "@/lib/owner";

/** The owner's illustrated avatar, or their initials on the brand gradient until one is set. */
export function OwnerAvatar({ owner, className, textClassName }: { owner: OwnerView | null; className?: string; textClassName?: string }) {
  if (owner?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={owner.avatarUrl} alt={owner.avatarAlt} className={cn("shrink-0 rounded-full bg-soft object-cover object-top", className)} />
    );
  }
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-full bg-[image:var(--brand-grad)] font-bold text-white", className, textClassName)}>
      {owner?.initials ?? ""}
    </span>
  );
}

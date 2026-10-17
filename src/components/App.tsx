"use client";

import type { ReactNode } from "react";
import { ScrollProvider } from "@/lib/scroll";
import { RevealObserver } from "@/components/ui/Reveal";
import Navigation, { type NavLink } from "./Navigation";
import { ui, type Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  links: NavLink[];
  name: string;
  initials: string;
  otherLocaleHref: string;
  banner: "sample" | "draft" | null;
  children: ReactNode;
}

export default function App({ locale, links, name, initials, otherLocaleHref, banner, children }: Props) {
  const t = ui(locale);
  return (
    <ScrollProvider>
      <RevealObserver />
      <a href="#main" className="skip-link">
        {t.skip}
      </a>
      <Navigation locale={locale} links={links} name={name} initials={initials} otherLocaleHref={otherLocaleHref} />
      {children}
      {banner && (
        <div className="banner" role="note">
          {banner === "sample" ? t.sampleBanner : t.draftBanner}
        </div>
      )}
    </ScrollProvider>
  );
}

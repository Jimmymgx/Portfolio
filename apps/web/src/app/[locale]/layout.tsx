import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import { PROFILE, SITE_SETTINGS, txt } from "@/lib/content";
import { DIR, LOCALES, isLocale, type Locale } from "@/lib/i18n";

const inter = localFont({
  src: "../../fonts/InterTight-Variable.woff2",
  variable: "--font-inter-tight",
  weight: "100 900",
  display: "swap",
});

const instrument = localFont({
  src: [
    { path: "../../fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = localFont({
  src: "../../fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
  preload: false,
});

// Arabic typography direction is pending the owner's choice; IBM Plex Sans Arabic is the working default.
const arabic = localFont({
  src: [
    { path: "../../fonts/IBMPlexSansArabic-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/IBMPlexSansArabic-600.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/IBMPlexSansArabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#f4f2ee",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale: Locale = raw;
  const title = txt(SITE_SETTINGS.meta.title, locale) ?? txt(PROFILE.displayName, locale) ?? "Portfolio";
  // Falls back to the confirmed role line until the longer description is approved.
  const description =
    txt(SITE_SETTINGS.meta.description, locale) ?? txt(PROFILE.roleLine, locale) ?? undefined;
  // In development, resolve social-image URLs against localhost so Next does not show a warning badge.
  // In production the real domain must be set (NEXT_PUBLIC_SITE_URL).
  const base = SITE_SETTINGS.siteUrl
    ? new URL(SITE_SETTINGS.siteUrl)
    : process.env.NODE_ENV !== "production"
      ? new URL("http://localhost:3000")
      : undefined;

  return {
    metadataBase: base,
    title,
    description,
    alternates: SITE_SETTINGS.siteUrl
      ? {
          canonical: `/${locale}`,
          languages: { en: "/en", ar: "/ar", "x-default": "/en" },
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "ar" ? "ar_EG" : "en_US",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      dir={DIR[locale]}
      className={`${inter.variable} ${instrument.variable} ${jetbrains.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      {/* Extensions such as Grammarly and ColorZilla add attributes to <body> before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = localFont({ src: "../fonts/InterTight-Variable.woff2", variable: "--font-inter-tight", weight: "100 900", display: "swap" });
const serif = localFont({ src: "../fonts/InstrumentSerif-Italic.woff2", variable: "--font-instrument", weight: "400", style: "italic", display: "swap", preload: false });
const mono = localFont({ src: "../fonts/JetBrainsMono-Variable.woff2", variable: "--font-jetbrains", weight: "100 800", display: "swap", preload: false });
const arabic = localFont({
  src: [
    { path: "../fonts/IBMPlexSansArabic-400.woff2", weight: "400" },
    { path: "../fonts/IBMPlexSansArabic-600.woff2", weight: "600" },
  ],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

/** Runs before first paint so the page never flashes the wrong theme. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("pf-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: { default: "Portfolio CMS", template: "%s · Portfolio CMS" },
  description: "Content management for the portfolio website.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f3f2fb" }, { media: "(prefers-color-scheme: dark)", color: "#0b0a13" }], width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${arabic.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

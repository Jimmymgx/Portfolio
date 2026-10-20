import { ui, type Locale } from "@/lib/i18n";

/** Shown instead of the site while maintenance mode is on in the CMS. */
export default function Maintenance({ locale, name }: { locale: Locale; name: string }) {
  const t = ui(locale);
  return (
    <main id="main" style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "var(--gutter)", textAlign: "center" }}>
      <div>
        <p className="eyebrow">{name}</p>
        <h1 className="h2" style={{ marginTop: 18 }}>
          {t.maintenanceTitle}
        </h1>
        <p className="lede" style={{ margin: "24px auto 0" }}>
          {t.maintenanceText}
        </p>
      </div>
    </main>
  );
}

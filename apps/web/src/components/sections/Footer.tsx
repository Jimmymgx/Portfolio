"use client";

import { ui, type Locale } from "@/lib/i18n";
import { useScroll } from "@/lib/scroll";
import s from "./Footer.module.css";

export default function Footer({ locale, name }: { locale: Locale; name: string }) {
  const t = ui(locale);
  const { scrollTo } = useScroll();
  return (
    <footer className={s.footer}>
      <div className={`container-x ${s.inner}`}>
        <p>
          © {new Date().getFullYear()} {name}. {t.rights}
        </p>
        <a
          href="#top"
          className={s.top}
          onClick={(e) => {
            e.preventDefault();
            scrollTo(0);
            history.replaceState(null, "", window.location.pathname);
          }}
        >
          {t.backToTop} <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  );
}

import type { ProjectKind } from "@/lib/data";
import s from "./MiniUI.module.css";

/**
 * Generic illustrative mini-interfaces built in CSS. They do NOT depict the real product
 * and are always captioned "Illustrative UI".
 */
export default function MiniUI({ kind, caption }: { kind: ProjectKind; caption: string }) {
  const browser = (
    <div className={s.browser}>
      <div className={s.bar}>
        <i />
        <i />
        <i />
        <b />
      </div>
      <div className={s.page}>
        <div className={s.nav}>
          <b />
          <span />
          <span />
          <span />
        </div>
        <div className={s.hero}>
          <em />
          <em />
          <u />
        </div>
        <div className={s.cards}>
          <div />
          <div />
          <div />
        </div>
      </div>
    </div>
  );

  const phone = (
    <div className={s.phone}>
      <div className={s.notch} />
      <div className={s.screen}>
        <div className={s.pHead} />
        <div className={s.pHero} />
        <div className={s.pRow}>
          <i />
          <span />
        </div>
        <div className={s.pRow}>
          <i />
          <span />
        </div>
        <div className={s.pRow}>
          <i />
          <span />
        </div>
        <div className={s.pTabs}>
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );

  const dash = (
    <div className={s.browser}>
      <div className={s.bar}>
        <i />
        <i />
        <i />
        <b />
      </div>
      <div className={s.dash}>
        <aside>
          <b />
          <span />
          <span />
          <span />
          <span />
        </aside>
        <div className={s.main}>
          <div className={s.stats}>
            <div />
            <div />
            <div />
          </div>
          <div className={s.chart}>
            {[40, 62, 48, 80, 58, 90, 70, 100].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className={s.table}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <figure className={`${s.wrap} ${s[kind.replace("-", "_")] ?? ""}`}>
      <div className={s.stage}>
        {kind === "website" && browser}
        {kind === "mobile" && phone}
        {kind === "system" && dash}
        {kind === "web-mobile" && (
          <>
            {browser}
            <div className={s.phoneFloat}>{phone}</div>
          </>
        )}
      </div>
      <figcaption className={s.caption}>{caption}</figcaption>
    </figure>
  );
}

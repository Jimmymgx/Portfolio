"use client";

import { useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import TechLogo, { brandGlow } from "@/components/ui/TechLogo";
import { ui, type Locale } from "@/lib/i18n";
import s from "./Skills.module.css";

export interface SkillView {
  id: string;
  name: string;
  symbol: string;
  logo?: string;
  familyId: string;
  familyLabel: string;
  projects: string[];
}

interface Props {
  locale: Locale;
  number: string;
  families: { id: string; label: string }[];
  skills: SkillView[];
}

const COLS_DESKTOP = 8;
const COLS_MOBILE = 4;

export default function Skills({ locale, number, families, skills }: Props) {
  const t = ui(locale);
  const [family, setFamily] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>(skills[0]?.id ?? "");
  const selected = skills.find((x) => x.id === selectedId) ?? skills[0];
  const glow = brandGlow(selected?.logo);

  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <div className="container-x">
        <SectionHeading id="skills-title" number={number} label={t.skillsLabel} lines={t.skillsTitle} />

        <div className={`${s.chips} rv`} role="group" aria-label={t.skillsLabel} style={{ ["--i" as string]: 1 }}>
          {[{ id: "all", label: t.allFamilies }, ...families].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${s.chip} ${family === f.id ? s.chipOn : ""}`}
              aria-pressed={family === f.id}
              onClick={() => setFamily(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={s.layout}>
          <ul className={s.grid}>
            {skills.map((sk, i) => {
              const dim = family !== "all" && sk.familyId !== family;
              const on = sk.id === selected?.id;
              const w8 = Math.floor(i / COLS_DESKTOP) + (i % COLS_DESKTOP);
              const w4 = Math.floor(i / COLS_MOBILE) + (i % COLS_MOBILE);
              return (
                <li
                  key={sk.id}
                  className={`${s.cell} rv-wave`}
                  style={{ ["--w8" as string]: w8, ["--w4" as string]: w4 }}
                >
                  <button
                    type="button"
                    className={`${s.tile} ${dim ? s.dim : ""} ${on ? s.on : ""}`}
                    aria-pressed={on}
                    aria-label={`${sk.name}, ${sk.familyLabel}`}
                    onClick={() => setSelectedId(sk.id)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setSelectedId(sk.id)}
                    onFocus={() => setSelectedId(sk.id)}
                  >
                    <span className={s.num}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={s.sym} aria-hidden="true">
                      {sk.symbol}
                    </span>
                    <span className={s.nm}>{sk.name}</span>
                    <span className={s.fam}>{sk.familyLabel}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <aside className={s.inspector} aria-label={t.inspector}>
            <div className={`card ${s.panel}`} aria-live="polite">
              {selected ? (
                <>
                  <div
                    className={s.logoWrap}
                    style={glow ? ({ ["--glow" as string]: glow } as React.CSSProperties) : undefined}
                  >
                    <TechLogo logo={selected.logo} symbol={selected.symbol} size={64} />
                  </div>
                  <div className={s.info}>
                    <h3 className={s.pname}>{selected.name}</h3>
                    <p className={s.meta}>
                      <span>{t.category}</span> {selected.familyLabel}
                    </p>
                    <p className={s.meta}>
                      <span>{t.usedIn}</span>{" "}
                      {selected.projects.length > 0 ? selected.projects.join(", ") : t.noProjectsLinked}
                    </p>
                  </div>
                </>
              ) : (
                <p className={s.meta}>{t.inspectorEmpty}</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

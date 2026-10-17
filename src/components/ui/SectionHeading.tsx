import { MaskLines } from "./Reveal";

interface Props {
  id: string;
  /** Published position, e.g. "03". */
  number: string;
  label: string;
  lines: readonly string[];
  accentLast?: boolean;
  className?: string;
}

export default function SectionHeading({ id, number, label, lines, accentLast = true, className = "" }: Props) {
  return (
    <div className={className}>
      <p className="eyebrow rv">
        {number} — {label}
      </p>
      <h2 id={id} className="h2" style={{ marginTop: 18 }}>
        <MaskLines lines={lines} accentLast={accentLast} />
      </h2>
    </div>
  );
}

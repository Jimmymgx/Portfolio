"use client";

import { experienceCreate, experienceUpdate } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";

const range = (r: Record<string, any>) => `${String(r.startDate).slice(0, 7)} to ${r.isCurrent ? "present" : r.endDate ? String(r.endDate).slice(0, 7) : "?"}`; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function ExperiencePage() {
  return (
    <ResourcePage
      title="Experience"
      description="Your work history. It appears on the public timeline together with your education, newest first."
      resource="experience"
      singular="position"
      publishable
      dialogSize="lg"
      createSchema={experienceCreate}
      updateSchema={experienceUpdate}
      rowTitle={(r) => `${r.position} at ${r.organization}`}
      defaults={{ isCurrent: false }}
      emptyHint="Add the roles you want visitors to see. Only entries you publish appear on the website."
      columns={[
        {
          header: "Position",
          cell: (r) => (
            <>
              <span className="block">{r.position}</span>
              <span className="block text-xs font-normal text-mute">{r.organization}</span>
            </>
          ),
        },
        { header: "Period", cell: (r) => range(r), hideOnMobile: true },
        { header: "Type", cell: (r) => r.employmentType || "-", hideOnMobile: true },
      ]}
      fields={[
        { kind: "text", name: "position", label: "Position", bilingual: true, required: true },
        { kind: "text", name: "organization", label: "Organization", bilingual: true, required: true },
        { kind: "text", name: "employmentType", label: "Employment type", placeholder: "Full-time, Freelance" },
        { kind: "text", name: "location", label: "Location", bilingual: true },
        { kind: "date", name: "startDate", label: "Start date", required: true },
        { kind: "date", name: "endDate", label: "End date", description: "Leave empty for a current position." },
        { kind: "switch", name: "isCurrent", label: "I currently work here", wide: true },
        { kind: "textarea", name: "description", label: "Description", bilingual: true, rows: 4 },
      ]}
    />
  );
}

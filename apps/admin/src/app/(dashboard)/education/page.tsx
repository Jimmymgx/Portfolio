"use client";

import { educationCreate, educationUpdate } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";

export default function EducationPage() {
  return (
    <ResourcePage
      title="Education"
      description="Qualifications you want to show. They appear on the public timeline next to your experience."
      resource="education"
      singular="qualification"
      publishable
      dialogSize="lg"
      createSchema={educationCreate}
      updateSchema={educationUpdate}
      rowTitle={(r) => `${r.qualification}, ${r.institution}`}
      columns={[
        {
          header: "Qualification",
          cell: (r) => (
            <>
              <span className="block">{r.qualification}</span>
              <span className="block text-xs font-normal text-mute">{r.institution}</span>
            </>
          ),
        },
        { header: "Field", cell: (r) => r.fieldOfStudy || "-", hideOnMobile: true },
        { header: "Graduated", cell: (r) => (r.endDate ? String(r.endDate).slice(0, 4) : "-"), hideOnMobile: true },
      ]}
      fields={[
        { kind: "text", name: "qualification", label: "Qualification", bilingual: true, required: true },
        { kind: "text", name: "institution", label: "Institution", bilingual: true, required: true },
        { kind: "text", name: "fieldOfStudy", label: "Field of study", bilingual: true },
        { kind: "date", name: "startDate", label: "Start date" },
        { kind: "date", name: "endDate", label: "Graduation date" },
        { kind: "textarea", name: "description", label: "Notes", bilingual: true, rows: 3 },
      ]}
    />
  );
}

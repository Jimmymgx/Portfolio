"use client";

import { achievementCreate, achievementUpdate } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";

export default function AchievementsPage() {
  return (
    <ResourcePage
      title="Achievements"
      description="Cards in the horizontal scrolling gallery. Only enter figures you can verify: numbers are shown exactly as typed and are never estimated."
      resource="achievements"
      singular="achievement"
      publishable
      reorderable
      dialogSize="lg"
      createSchema={achievementCreate}
      updateSchema={achievementUpdate}
      rowTitle={(r) => r.title}
      columns={[
        {
          header: "Achievement",
          cell: (r) => (
            <>
              <span className="block">{r.title}</span>
              <span className="block text-xs font-normal text-mute">{r.platform || "-"}</span>
            </>
          ),
        },
        { header: "Figure", cell: (r) => (r.numericValue != null ? `${r.numericValue}${r.numericSuffix ?? ""}` : "-"), hideOnMobile: true },
      ]}
      fields={[
        { kind: "text", name: "title", label: "Title", bilingual: true, required: true },
        { kind: "textarea", name: "description", label: "Description", bilingual: true, rows: 2 },
        { kind: "number", name: "numericValue", label: "Figure", description: "A whole number, or leave empty." },
        { kind: "text", name: "numericSuffix", label: "Suffix", max: 10, placeholder: "+, %, x" },
        { kind: "text", name: "platform", label: "Platform or organization" },
        { kind: "url", name: "verificationUrl", label: "Verification link" },
        { kind: "media", name: "logoMediaId", label: "Logo", accept: "image" },
        { kind: "text", name: "logoKey", label: "Bundled logo key", description: "Optional, for example react or nodejs." },
      ]}
    />
  );
}

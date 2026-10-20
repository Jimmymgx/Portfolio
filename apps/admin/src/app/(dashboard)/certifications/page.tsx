"use client";

import { ExternalLink } from "lucide-react";
import { certificationCreate, certificationUpdate } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";

export default function CertificationsPage() {
  return (
    <ResourcePage
      title="Certifications"
      description="Shown as the numbered list with the ink hover effect. The section appears on the website only when at least one certification is published."
      resource="certifications"
      singular="certification"
      publishable
      reorderable
      dialogSize="lg"
      createSchema={certificationCreate}
      updateSchema={certificationUpdate}
      rowTitle={(r) => r.title}
      columns={[
        {
          header: "Certification",
          cell: (r) => (
            <>
              <span className="block">{r.title}</span>
              <span className="block text-xs font-normal text-mute">{r.issuer}</span>
            </>
          ),
        },
        { header: "Issued", cell: (r) => (r.issueDate ? String(r.issueDate).slice(0, 7) : "-"), hideOnMobile: true },
        {
          header: "Verification",
          hideOnMobile: true,
          cell: (r) =>
            r.verificationUrl ? (
              <a href={r.verificationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                Open <ExternalLink className="size-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              "-"
            ),
        },
      ]}
      fields={[
        { kind: "text", name: "title", label: "Title", bilingual: true, required: true },
        { kind: "text", name: "issuer", label: "Issuing organization", bilingual: true, required: true },
        { kind: "date", name: "issueDate", label: "Issue date" },
        { kind: "url", name: "verificationUrl", label: "Verification link" },
        { kind: "textarea", name: "description", label: "Description", bilingual: true, rows: 2 },
        { kind: "media", name: "mediaId", label: "Image or logo", accept: "image", wide: true },
      ]}
    />
  );
}

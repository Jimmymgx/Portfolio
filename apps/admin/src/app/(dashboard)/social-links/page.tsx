"use client";

import { SOCIAL_PLATFORMS, socialLinkCreate, socialLinkUpdate } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";
import { titleCase } from "@/lib/utils";

export default function SocialLinksPage() {
  return (
    <ResourcePage
      title="Social links"
      description="Professional profiles shown in About and Contact. Only add platforms you actually use."
      resource="socialLinks"
      singular="link"
      publishable
      reorderable
      createSchema={socialLinkCreate}
      updateSchema={socialLinkUpdate}
      rowTitle={(r) => r.label}
      columns={[
        {
          header: "Link",
          cell: (r) => (
            <>
              <span className="block">{r.label}</span>
              <span className="block text-xs font-normal text-mute">{titleCase(r.platform)}</span>
            </>
          ),
        },
        { header: "Address", cell: (r) => <span className="block max-w-[28ch] truncate">{r.url}</span>, hideOnMobile: true },
      ]}
      fields={[
        { kind: "select", name: "platform", label: "Platform", required: true, options: SOCIAL_PLATFORMS.map((p) => ({ value: p, label: titleCase(p) })) },
        { kind: "text", name: "label", label: "Label", bilingual: true, required: true },
        { kind: "url", name: "url", label: "URL", required: true, wide: true },
        { kind: "text", name: "handle", label: "Username to display", description: "Optional." },
        { kind: "text", name: "icon", label: "Icon name", description: "Optional." },
      ]}
    />
  );
}

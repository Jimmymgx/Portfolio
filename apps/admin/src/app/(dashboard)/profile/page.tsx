"use client";

import { profileFields } from "@portfolio/validation";
import { SingletonPage } from "@/components/resource/singleton-page";
import { api } from "@/lib/api";

export default function ProfilePage() {
  return (
    <SingletonPage
      id="profile"
      title="Profile"
      description="Who you are. Every field has an English and an Arabic version; Arabic falls back to English when left empty."
      client={api.profile}
      schema={profileFields}
      groups={[
        {
          title: "Identity",
          fields: [
            { kind: "text", name: "fullName", label: "Full name", bilingual: true, required: true },
            { kind: "text", name: "displayName", label: "Display name", bilingual: true, required: true, description: "Shown in the page title, navigation and ID card." },
            { kind: "text", name: "firstName", label: "First name", bilingual: true, required: true, description: "Used for the large outlined word behind the hero portrait." },
            { kind: "text", name: "initials", label: "Initials", required: true, max: 6, description: "Shown in the round navigation mark." },
            { kind: "text", name: "professionalTitle", label: "Professional title", bilingual: true, required: true },
            { kind: "text", name: "roleLine", label: "Role line", bilingual: true, description: "Optional one-liner such as “Developer | Project Manager”." },
            { kind: "text", name: "tagline", label: "Tagline", bilingual: true, description: "Optional short phrase. Only shown where the site uses it." },
          ],
        },
        {
          title: "Positioning",
          fields: [
            { kind: "text", name: "expertise", label: "Main expertise", bilingual: true },
            { kind: "text", name: "audience", label: "Who you work with", bilingual: true },
            { kind: "text", name: "location", label: "Location", bilingual: true, description: "Leave empty to hide it." },
          ],
        },
        {
          title: "Biography",
          description: "Plain text. Use a blank line to start a new paragraph.",
          fields: [
            { kind: "textarea", name: "biography", label: "Biography", bilingual: true, rows: 7 },
            { kind: "textarea", name: "shortBiography", label: "Short biography", bilingual: true, rows: 3 },
            { kind: "textarea", name: "professionalStatement", label: "Professional statement", bilingual: true, rows: 3 },
          ],
        },
        {
          title: "Contact details",
          fields: [
            { kind: "email", name: "publicEmail", label: "Public email" },
            { kind: "text", name: "publicPhone", label: "Public phone", description: "Only appears on the site if you also switch it on under Contact." },
          ],
        },
        {
          title: "Files",
          fields: [
            { kind: "media", name: "avatarMediaId", label: "Profile picture", accept: "image", description: "Used on the ID card and as the social sharing portrait." },
            { kind: "media", name: "resumeMediaId", label: "Résumé (PDF)", accept: "document", description: "Optional. When set, a download button can be shown." },
          ],
        },
      ]}
    />
  );
}

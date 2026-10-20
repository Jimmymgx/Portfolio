"use client";

import { contactFields } from "@portfolio/validation";
import { SingletonPage } from "@/components/resource/singleton-page";
import { api } from "@/lib/api";

export default function ContactPage() {
  return (
    <SingletonPage
      id="contact"
      title="Contact"
      description="The contact section. Phone and WhatsApp stay hidden unless you switch them on."
      client={api.contact}
      schema={contactFields}
      defaults={{ showPhone: false, showWhatsapp: false, enableContactForm: false }}
      previewPath="/#contact"
      groups={[
        {
          title: "Text",
          fields: [
            { kind: "text", name: "heading", label: "Heading", bilingual: true, description: "Empty uses “Let's build something together.”" },
            { kind: "text", name: "description", label: "Intro line", bilingual: true },
          ],
        },
        {
          title: "Channels",
          fields: [
            { kind: "email", name: "publicEmail", label: "Public email", description: "Empty uses the email from your profile." },
            { kind: "text", name: "publicPhone", label: "Phone" },
            { kind: "url", name: "whatsappUrl", label: "WhatsApp link", wide: true, placeholder: "https://wa.me/…" },
            { kind: "switch", name: "showPhone", label: "Show phone number", wide: true },
            { kind: "switch", name: "showWhatsapp", label: "Show WhatsApp", wide: true },
            { kind: "switch", name: "enableContactForm", label: "Enable the contact form", wide: true, description: "Messages are stored under Messages. No email is sent." },
          ],
        },
      ]}
    />
  );
}

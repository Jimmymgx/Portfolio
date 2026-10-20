"use client";

import { aboutFactCreate, aboutFactUpdate, aboutFields } from "@portfolio/validation";
import { ResourcePage } from "@/components/resource/resource-page";
import { SingletonPage } from "@/components/resource/singleton-page";
import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About" description="The About section, the hanging ID card and the quick facts next to it." />
      <Tabs defaultValue="section">
        <TabsList>
          <TabsTrigger value="section">Section & ID card</TabsTrigger>
          <TabsTrigger value="facts">Quick facts</TabsTrigger>
        </TabsList>

        <TabsContent value="section">
          <SingletonPage
            embedded
            id="about"
            title="About section"
            client={api.about}
            schema={aboutFields}
            defaults={{ showIdCard: true }}
            groups={[
              {
                title: "Text",
                description: "Empty fields use the biography from your profile.",
                fields: [
                  { kind: "text", name: "heading", label: "Heading", bilingual: true },
                  { kind: "textarea", name: "introduction", label: "Introduction", bilingual: true, rows: 4 },
                  { kind: "textarea", name: "fullDescription", label: "Full description", bilingual: true, rows: 6 },
                  { kind: "text", name: "quote", label: "Quote", bilingual: true, description: "Optional. Only shown when filled." },
                ],
              },
              {
                title: "ID card",
                description: "Nothing is invented: the card shows your name and title, plus whatever you enter here.",
                fields: [
                  { kind: "switch", name: "showIdCard", label: "Show the ID card", wide: true },
                  { kind: "text", name: "idCardTitle", label: "Card header", bilingual: true, description: "For example DEVELOPER ID." },
                  { kind: "text", name: "idCardSubtitle", label: "Card subtitle", bilingual: true },
                  { kind: "text", name: "idCardBackContent", label: "Closing line on the back", bilingual: true },
                  { kind: "media", name: "idCardPortraitMediaId", label: "Card portrait", accept: "image", wide: true, description: "Empty uses your profile picture." },
                ],
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="facts">
          <ResourcePage
            embedded
            title="Quick facts"
            description="Extra rows shown after the built-in facts (role, expertise, audience, email)."
            resource="aboutFacts"
            singular="fact"
            publishable
            reorderable
            createSchema={aboutFactCreate}
            updateSchema={aboutFactUpdate}
            rowTitle={(r) => r.label}
            columns={[
              { header: "Label", cell: (r) => r.label },
              { header: "Value", cell: (r) => r.value, hideOnMobile: true },
            ]}
            fields={[
              { kind: "text", name: "label", label: "Label", bilingual: true, required: true },
              { kind: "text", name: "value", label: "Value", bilingual: true, required: true },
              { kind: "text", name: "icon", label: "Icon name", description: "Optional." },
            ]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

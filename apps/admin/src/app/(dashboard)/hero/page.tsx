"use client";

import { heroFields } from "@portfolio/validation";
import { SingletonPage } from "@/components/resource/singleton-page";
import { api } from "@/lib/api";

type Preview = { url: string } | null;

export default function HeroPage() {
  return (
    <SingletonPage
      id="hero"
      title="Hero"
      description="The first screen. You control the text, buttons and media. The layout and animation are fixed so the design always stays intact."
      client={api.hero}
      schema={heroFields}
      defaults={{ audioEnabled: true }}
      groups={[
        {
          title: "Text",
          description: "Empty fields use the name and title from your profile.",
          fields: [
            { kind: "text", name: "headline", label: "Headline", bilingual: true },
            { kind: "text", name: "subtitle", label: "Subtitle", bilingual: true },
            { kind: "textarea", name: "description", label: "Introduction", bilingual: true, rows: 3 },
            { kind: "text", name: "backgroundWord", label: "Background word", bilingual: true, description: "The large outlined word behind the portrait." },
          ],
        },
        {
          title: "Buttons",
          description: "Leave a button empty to use the default label and target. Targets: #work, #contact, /path or a full URL.",
          fields: [
            { kind: "text", name: "primaryButtonText", label: "Primary button label", bilingual: true },
            { kind: "text", name: "primaryButtonUrl", label: "Primary button target", wide: true, placeholder: "#work" },
            { kind: "text", name: "secondaryButtonText", label: "Secondary button label", bilingual: true },
            { kind: "text", name: "secondaryButtonUrl", label: "Secondary button target", wide: true, placeholder: "#contact" },
          ],
        },
        {
          title: "Media",
          description: "Landscape or portrait videos work best at about 8 to 15 seconds with a plain light background. Provide both MP4 and WebM for all browsers. MP4 up to 80 MB.",
          fields: [
            { kind: "media", name: "videoMp4MediaId", label: "Video (MP4)", accept: "video", description: "H.264 with AAC audio." },
            { kind: "media", name: "videoWebmMediaId", label: "Video (WebM)", accept: "video", description: "VP9 with Opus audio, 4:2:0 colour." },
            { kind: "media", name: "posterMediaId", label: "Poster image", accept: "image", description: "Shown before the video loads." },
            { kind: "media", name: "fallbackImageMediaId", label: "Fallback image", accept: "image", description: "Shown if there is no video." },
            { kind: "switch", name: "audioEnabled", label: "Allow visitors to turn on sound", description: "Sound only starts after a visitor presses the sound button.", wide: true },
          ],
        },
      ]}
      below={(record) => {
        const mp4 = (record?.mediaPreview?.videoMp4MediaId as Preview) ?? null;
        const webm = (record?.mediaPreview?.videoWebmMediaId as Preview) ?? null;
        const poster = (record?.mediaPreview?.posterMediaId as Preview) ?? null;
        if (!mp4 && !webm) return null;
        return (
          <section className="card p-6" aria-labelledby="hero-preview">
            <h2 id="hero-preview" className="text-base font-semibold">
              Video preview
            </h2>
            <p className="mb-4 mt-0.5 text-sm text-mute">Shows the saved files. Save the draft after choosing new files to refresh this preview.</p>
            <video className="max-h-[420px] rounded-xl bg-soft" controls preload="metadata" poster={poster?.url} aria-label="Hero video preview">
              {webm && <source src={webm.url} type="video/webm" />}
              {mp4 && <source src={mp4.url} type="video/mp4" />}
            </video>
          </section>
        );
      }}
    />
  );
}

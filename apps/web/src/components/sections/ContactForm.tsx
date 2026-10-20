"use client";

import { useState, type FormEvent } from "react";
import { ui, type Locale } from "@/lib/i18n";
import s from "./Contact.module.css";

type Status = "idle" | "sending" | "sent" | "error";

/** Public contact form. Posts to the API; the API stores the message (no email is sent). */
export default function ContactForm({ locale, apiUrl }: { locale: Locale; apiUrl: string }) {
  const t = ui(locale);
  const [status, setStatus] = useState<Status>("idle");
  const [shortMsg, setShortMsg] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const message = String(data.get("message") ?? "").trim();
    if (message.length < 10) {
      setShortMsg(true);
      return;
    }
    setShortMsg(false);
    setStatus("sending");
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/public/contact/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
          subject: String(data.get("subject") ?? "").trim() || undefined,
          message,
          website: String(data.get("website") ?? ""),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className={s.form} onSubmit={onSubmit} aria-labelledby="cf-title">
      <h3 id="cf-title" className="eyebrow">
        {t.formTitle}
      </h3>
      <div className={s.formRow}>
        <label className={s.formField}>
          <span>{t.formName}</span>
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label className={s.formField}>
          <span>{t.formEmail}</span>
          <input name="email" type="email" required maxLength={190} autoComplete="email" />
        </label>
      </div>
      <label className={s.formField}>
        <span>{t.formSubject}</span>
        <input name="subject" maxLength={200} />
      </label>
      <label className={s.formField}>
        <span>{t.formMessage}</span>
        <textarea name="message" required rows={5} maxLength={5000} aria-invalid={shortMsg} aria-describedby={shortMsg ? "cf-short" : undefined} />
        {shortMsg && (
          <em id="cf-short" role="alert" className={s.formHint}>
            {t.formShort}
          </em>
        )}
      </label>
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div className={s.honey} aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
        {status === "sending" ? t.formSending : t.formSend}
      </button>
      <p className={s.formStatus} role="status" aria-live="polite">
        {status === "sent" ? t.formThanks : status === "error" ? t.formError : ""}
      </p>
    </form>
  );
}

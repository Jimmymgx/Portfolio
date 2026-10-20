"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { changePasswordBody, siteFields, type ChangePasswordBody } from "@portfolio/validation";
import { SingletonPage } from "@/components/resource/singleton-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, titleCase } from "@/lib/utils";

function Account() {
  const { user } = useAuth();
  const f = useForm<ChangePasswordBody>({ resolver: zodResolver(changePasswordBody), defaultValues: { currentPassword: "", newPassword: "" } });
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (v: ChangePasswordBody) => api.auth.changePassword(v.currentPassword, v.newPassword),
    onSuccess: () => (toast.success("Password updated. Other sessions were signed out"), f.reset()),
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) Object.entries(e.fieldErrors).forEach(([p, message]) => f.setError(p as never, { message }));
      setError(errorMessage(e));
    },
  });
  const e = f.formState.errors;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-6" aria-labelledby="acct">
        <h2 id="acct" className="text-base font-semibold">Your account</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-mute">Name</dt>
          <dd>{user?.name}</dd>
          <dt className="text-mute">Email</dt>
          <dd>{user?.email}</dd>
          <dt className="text-mute">Role</dt>
          <dd>{user ? titleCase(user.role) : ""}</dd>
          <dt className="text-mute">Last sign-in</dt>
          <dd>{formatDate(user?.lastLoginAt, true)}</dd>
        </dl>
      </section>

      <section className="card p-6" aria-labelledby="pw">
        <h2 id="pw" className="text-base font-semibold">Change password</h2>
        <form onSubmit={f.handleSubmit((v) => (setError(null), m.mutate(v)))} noValidate className="mt-4 space-y-4">
          {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">{error}</p>}
          <Field label="Current password" htmlFor="cp" error={e.currentPassword?.message}>
            <Input id="cp" type="password" autoComplete="current-password" aria-invalid={!!e.currentPassword} {...f.register("currentPassword")} />
          </Field>
          <Field label="New password" htmlFor="np" error={e.newPassword?.message} description="At least 12 characters with upper case, lower case and a number. Other devices are signed out.">
            <Input id="np" type="password" autoComplete="new-password" aria-invalid={!!e.newPassword} {...f.register("newPassword")} />
          </Field>
          <Button type="submit" loading={m.isPending}>Update password</Button>
        </form>
      </section>
    </div>
  );
}

function Website() {
  const refresh = useMutation({ mutationFn: () => api.refreshWebsite(), onSuccess: () => toast.success("The website was asked to refresh"), onError: (e) => toast.error(errorMessage(e)) });
  const { canEdit } = useAuth();
  return (
    <section className="card max-w-2xl space-y-4 p-6" aria-labelledby="ws">
      <h2 id="ws" className="text-base font-semibold">Refresh the website</h2>
      <p className="text-sm text-mute">
        After you publish, the website refreshes by itself. If something looks out of date, ask it to refresh now. This only clears the website&apos;s cache; it does not publish anything.
      </p>
      <Button loading={refresh.isPending} disabled={!canEdit} onClick={() => refresh.mutate()}>
        Refresh now
      </Button>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Site identity, your account and website maintenance." />
      <Tabs defaultValue="site">
        <TabsList>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
        </TabsList>
        <TabsContent value="site">
          <SingletonPage
            embedded
            id="site"
            title="Site identity"
            client={api.site}
            schema={siteFields}
            defaults={{ primaryLanguage: "EN", maintenanceMode: false }}
            groups={[
              {
                title: "Identity",
                fields: [
                  { kind: "text", name: "siteName", label: "Site name", bilingual: true, required: true },
                  { kind: "textarea", name: "siteDescription", label: "Site description", bilingual: true, rows: 2 },
                  { kind: "url", name: "siteUrl", label: "Public website address", wide: true, description: "For example https://yourname.com. Used for canonical links, the sitemap and social previews." },
                  { kind: "select", name: "primaryLanguage", label: "Default language", required: true, options: [{ value: "EN", label: "English" }, { value: "AR", label: "العربية" }] },
                  { kind: "text", name: "footerText", label: "Footer text", bilingual: true },
                ],
              },
              {
                title: "Branding",
                fields: [
                  { kind: "media", name: "faviconMediaId", label: "Favicon", accept: "image", description: "A square image, 64×64 or larger." },
                  { kind: "media", name: "logoMediaId", label: "Logo", accept: "image" },
                ],
              },
              {
                title: "Maintenance",
                fields: [{ kind: "switch", name: "maintenanceMode", label: "Maintenance mode", description: "Shows visitors a short “back soon” page instead of the site. Publish to apply.", wide: true }],
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="account">
          <Account />
        </TabsContent>
        <TabsContent value="website">
          <Website />
        </TabsContent>
      </Tabs>
    </>
  );
}

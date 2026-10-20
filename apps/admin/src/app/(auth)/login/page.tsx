"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Languages, Lock } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { loginBody, type LoginBody } from "@portfolio/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwnerAvatar } from "@/components/owner-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Field } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePublicOwner } from "@/lib/owner";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const owner = usePublicOwner();

  const { register, handleSubmit, formState } = useForm<LoginBody>({ resolver: zodResolver(loginBody), defaultValues: { email: "", password: "" } });

  // Already signed in: skip the form.
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  useEffect(() => {
    if (!loading && user) router.replace(target);
  }, [loading, user, router, target]);

  async function onSubmit(values: LoginBody) {
    setError(null);
    try {
      const session = await api.auth.login(values.email, values.password);
      qc.setQueryData(["me"], session.user);
      router.replace(target);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <section aria-label="Welcome" className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-[image:var(--hero)] p-14 lg:flex">
        <div aria-hidden="true" className="absolute -bottom-52 -left-40 size-[560px] rounded-full bg-[var(--orb-1)] opacity-90 blur-[70px]" />
        <div aria-hidden="true" className="absolute -right-32 -top-24 size-[420px] rounded-full bg-[var(--orb-2)] opacity-85 blur-[80px]" />

        <div className="relative flex items-center gap-3 text-[var(--hero-ink)]">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-full border-[1.5px] border-current font-mono text-xs">
            {owner?.initials ?? "CMS"}
          </span>
          <span className="text-base font-semibold tracking-tight">{owner?.fullName ?? "Portfolio Studio"}</span>
        </div>

        {owner?.avatarUrl && (
          <figure className="absolute right-14 top-28 hidden w-[210px] rotate-[4deg] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_60px_-24px_rgba(21,19,43,0.45)] ring-4 ring-[var(--glass-line)] xl:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={owner.avatarUrl} alt={owner.avatarAlt} className="aspect-[3/4] w-full object-cover object-top" />
          </figure>
        )}

        <div className="relative max-w-[560px] space-y-7 text-[var(--hero-ink)]">
          <p className="text-[clamp(3.5rem,6vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Your work, <span className="display-serif font-normal">always</span> in sync.
          </p>
          <p className="max-w-md text-[19px] leading-normal text-[var(--hero-ink-2)]">Write once in two languages, review the draft, publish, and your website updates the moment you press the button.</p>
        </div>

        <ul className="relative flex flex-wrap gap-3.5">
          {[
            { icon: <Check className="size-5" aria-hidden="true" />, title: "Draft, then publish", text: "Nothing goes live until you say so" },
            { icon: <Languages className="size-5" aria-hidden="true" />, title: "English and Arabic", text: "Every field has both tabs" },
          ].map((f) => (
            <li key={f.title} className="flex items-center gap-3.5 rounded-[18px] border border-[var(--glass-line)] bg-[var(--glass)] px-[18px] py-4 backdrop-blur-xl">
              <span aria-hidden="true" className="grid size-[38px] place-items-center rounded-[11px] bg-[var(--hero-ink)] text-[var(--hero-bg)]">
                {f.icon}
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-semibold text-[var(--hero-ink)]">{f.title}</span>
                <span className="block text-[13px] text-[var(--hero-ink-2)]">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <main className="flex flex-1 flex-col px-5 py-6 sm:px-10 lg:w-[600px] lg:flex-none lg:px-16 lg:pb-12">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5 lg:invisible">
            <OwnerAvatar owner={owner} className="size-9" textClassName="font-mono text-[11px]" />
            <span className="font-semibold tracking-tight">{owner?.fullName ?? "Portfolio Studio"}</span>
          </span>
          <ThemeToggle showLabel />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-10">
          <div className="space-y-2.5">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-mute">Content studio</p>
            <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.03em]">
              Welcome back{owner?.firstName ? "," : "."} {owner?.firstName && <span className="display-serif text-accent">{owner.firstName}.</span>}
            </h1>
            <p className="text-base text-mute">Sign in to manage your website content.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 rounded-3xl p-7" aria-describedby={error ? "login-error" : undefined}>
            {error && (
              <p id="login-error" role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="username" autoFocus className="h-[52px] rounded-2xl px-4 text-base" aria-invalid={!!formState.errors.email} aria-describedby={formState.errors.email ? "email-err" : undefined} {...register("email")} />
            </Field>
            <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" className="h-[52px] rounded-2xl px-4 text-base" aria-invalid={!!formState.errors.password} aria-describedby={formState.errors.password ? "password-err" : undefined} {...register("password")} />
            </Field>
            <Button type="submit" className="h-[54px] w-full rounded-2xl text-base font-semibold" size="lg" loading={formState.isSubmitting}>
              Sign in
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </Button>
          </form>

          <p className="flex items-center gap-2 text-[13px] text-mute">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            Encrypted session. No account? Ask the site owner to create one.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

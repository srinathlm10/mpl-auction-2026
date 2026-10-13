"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { Logo } from "@/components/ui/Logo";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  if (!configured) return <SetupNotice />;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-wide">Admin login</h1>
          <p className="text-sm text-muted">Management Premiere League</p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <Link href="/" className="mt-5 block text-center text-sm text-muted hover:text-primary">← Back to site</Link>
      </div>
    </main>
  );
}

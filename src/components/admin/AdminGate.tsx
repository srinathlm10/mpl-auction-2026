"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { liveConfigured } from "@/lib/live-config";
import type { ScorerLogin } from "@/lib/live-store";
import { useScorer } from "@/lib/use-scorer";

interface AdminSession {
  login: ScorerLogin;
}

const AdminContext = createContext<AdminSession | null>(null);

/** The signed-in admin, for anything inside <AdminGate>. */
export function useAdmin(): AdminSession {
  const session = useContext(AdminContext);
  if (!session) throw new Error("useAdmin needs an AdminGate around it");
  return session;
}

/** One ID and password (no sign-up). Everyone else can read the whole site without it. */
function SignInForm({ onSignIn, notice }: { onSignIn: (user: string, password: string) => Promise<string | null>; notice?: string }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const message = await onSignIn(user, password);
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-5 sm:p-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase">Admin sign-in</h1>
        <p className="mt-1 text-sm text-muted">
          Only the MPL admin signs in here, to update scores and manage the site. Everything else is open to everyone,
          so to follow the matches just{" "}
          <Link href="/live" className="font-semibold text-primary hover:underline">open the live scores</Link>: no login needed.
        </p>
      </div>
      {notice && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">{notice}</p>}
      <div>
        <label className="label" htmlFor="scorer-id">ID</label>
        <input id="scorer-id" className="input" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={user} onChange={(e) => setUser(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="scorer-password">Password</label>
        <input id="scorer-password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

function SetupSteps() {
  return (
    <div className="card mx-auto max-w-2xl space-y-3 p-5 text-sm sm:p-6">
      <h1 className="font-display text-2xl font-bold uppercase">The admin login is not set up yet</h1>
      <p className="text-muted">It needs a free Supabase project (no sign-ups for anyone). Steps (also in the README, “Live scores”):</p>
      <ol className="list-decimal space-y-1 pl-5 text-muted">
        <li>In Supabase, open <b>SQL Editor</b>, paste the file <code>supabase/live-scores.sql</code> and run it. It creates the login.</li>
        <li>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (Netlify → Site configuration → Environment variables, or <code>.env.local</code>) and redeploy.</li>
        <li>Come back to this page and sign in with the ID and password.</li>
      </ol>
    </div>
  );
}

/**
 * Only the admin gets past this. Everyone else sees `fallback`, or the sign-in form when there is none.
 *
 * This decides what appears on screen. The real protection is underneath: the database refuses a score
 * without the login, and an auction saved in a browser never reaches anyone else.
 */
export function AdminGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { state, signIn, retry } = useScorer();
  const session = useMemo(() => (state.phase === "ready" ? { login: state.login } : null), [state]);

  if (session) return <AdminContext.Provider value={session}>{children}</AdminContext.Provider>;
  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <main className="container-page py-6 sm:py-10">
      {!liveConfigured ? (
        <SetupSteps />
      ) : state.phase === "signed-out" ? (
        <SignInForm onSignIn={signIn} notice={state.notice} />
      ) : state.phase === "error" ? (
        <div className="card mx-auto max-w-xl space-y-3 p-5 text-sm sm:p-6">
          <h1 className="font-display text-2xl font-bold uppercase">Can&apos;t check the sign-in</h1>
          <p className="text-muted">Check the internet connection and try again. ({state.message})</p>
          <button type="button" className="btn-primary" onClick={retry}>Try again</button>
        </div>
      ) : (
        <p className="text-center text-muted">Checking the sign-in…</p>
      )}
    </main>
  );
}

import Link from "next/link";

/** Shown instead of the admin area when Supabase env variables are missing. */
export function SetupNotice() {
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <div className="card max-w-xl p-8">
        <h1 className="font-display text-3xl font-bold uppercase">Connect Supabase to run the live auction</h1>
        <p className="mt-3 text-muted">
          The site is currently running on the built-in player list (read-only). To run the auction:
        </p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm">
          <li>Create a Supabase project and run <code className="rounded bg-border px-1">supabase/setup-all.sql</code> in the SQL editor.</li>
          <li>Copy <code className="rounded bg-border px-1">.env.example</code> to <code className="rounded bg-border px-1">.env.local</code> and fill in the project URL and anon key.</li>
          <li>Restart <code className="rounded bg-border px-1">npm run dev</code>.</li>
        </ol>
        <p className="mt-4 text-sm text-muted">Full steps are in the README.</p>
        <Link href="/" className="btn-primary mt-6">Back to site</Link>
      </div>
    </main>
  );
}

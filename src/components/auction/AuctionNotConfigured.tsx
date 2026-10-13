import Link from "next/link";

/** Shown on the auction pages when the Supabase settings are missing. */
export function AuctionNotConfigured() {
  return (
    <main className="container-page flex min-h-screen items-center justify-center">
      <div className="card max-w-lg p-8 text-center">
        <h1 className="font-display text-3xl font-bold uppercase">Live auction is not set up yet</h1>
        <p className="mt-2 text-muted">
          The live auction needs a Supabase project. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (in <code>.env.local</code>, or your host&apos;s environment
          variables, then redeploy) and run <code>supabase/setup-all.sql</code>.
        </p>
        <Link href="/" className="btn-primary mt-5">Back to site</Link>
      </div>
    </main>
  );
}

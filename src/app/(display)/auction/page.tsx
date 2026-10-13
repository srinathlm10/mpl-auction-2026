import type { Metadata } from "next";
import Link from "next/link";
import { AuctionStage } from "@/components/auction/AuctionStage";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Live Auction" };

/** Public, view-only screen for the projector. No login; it just mirrors the admin screen. */
export default function AuctionDisplayPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="container-page flex min-h-screen items-center justify-center">
        <div className="card max-w-lg p-8 text-center">
          <h1 className="font-display text-3xl font-bold uppercase">Live auction is not set up yet</h1>
          <p className="mt-2 text-muted">
            The live auction needs a Supabase project. Add the keys to <code>.env.local</code> and run the SQL files described in the README.
          </p>
          <Link href="/" className="btn-primary mt-5">Back to site</Link>
        </div>
      </main>
    );
  }
  return <AuctionStage mode="display" />;
}

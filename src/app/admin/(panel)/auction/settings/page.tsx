import { SettingsForm } from "@/components/admin/SettingsForm";
import { createServerSupabase } from "@/lib/supabase/server";
import type { AuctionSettings, Sport } from "@/lib/types";

export default async function AuctionSettingsPage() {
  const supabase = await createServerSupabase();
  const [settings, sports] = await Promise.all([
    supabase.from("auction_settings").select("*").eq("id", 1).single(),
    supabase.from("sports").select("*").order("id"),
  ]);

  if (settings.error || sports.error) {
    return (
      <div className="card mx-auto max-w-xl p-6">
        <h1 className="font-display text-3xl font-bold uppercase">Can&apos;t load the settings</h1>
        <p className="mt-2 text-muted">{settings.error?.message ?? sports.error?.message}</p>
        <p className="mt-2 text-sm text-muted">Run <code>supabase/auction.sql</code> in the Supabase SQL editor first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-4xl font-extrabold uppercase tracking-wide">Auction settings</h1>
      <SettingsForm settings={settings.data as AuctionSettings} sports={sports.data as Sport[]} />
    </div>
  );
}

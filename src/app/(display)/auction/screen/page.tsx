import type { Metadata } from "next";
import { AuctionNotConfigured } from "@/components/auction/AuctionNotConfigured";
import { AuctionStage } from "@/components/auction/AuctionStage";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Live Auction – screen" };

/** View-only copy of the auction for a second screen / projector. It follows /auction live. */
export default function AuctionScreenPage() {
  if (!isSupabaseConfigured) return <AuctionNotConfigured />;
  return <AuctionStage mode="display" />;
}
